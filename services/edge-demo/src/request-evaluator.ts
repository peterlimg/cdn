import { getDomain, getUsageState, incrementUsage } from "../../control-api/src/server"
import { fetchOriginAsset } from "../../origin-demo/src/server"
import { emitEvent } from "./event-emitter"
import { readCache, writeCache } from "./cache-store"
import { normalizeRequest } from "./request-normalizer"
import { getState, setState } from "../../../lib/demo/demo-store"
import type { RequestProof } from "../../shared/src/types"

function nextRequestId() {
  const current = getState().requestCounter + 1
  setState((state) => ({ ...state, requestCounter: current }))
  return `req-${String(current).padStart(4, "0")}`
}

export function evaluateRequest(input: { domainId: string; path?: string }) {
  const domain = getDomain(input.domainId)

  if (!domain) {
    throw new Error("Domain not found")
  }

  const normalized = normalizeRequest({ hostname: domain.hostname, path: input.path ?? domain.routeHint ?? domain.healthCheckPath ?? "/" })
  const requestId = nextRequestId()
  const timestamp = new Date().toISOString()
  const activeRevision = domain.revisions.find((revision) => revision.id === domain.appliedRevisionId)

  if (!activeRevision) {
    const proof: RequestProof = {
      requestId,
      domainId: domain.id,
      hostname: normalized.hostname,
      path: normalized.path,
      timestamp,
      revisionId: "unknown",
      cacheStatus: "BYPASS",
      finalDisposition: "blocked",
      bytesServed: 0,
      quotaUsedBytes: getState().quotaUsedBytes,
      quotaLimitBytes: getState().quotaLimitBytes,
      message: "No applied revision available for this domain.",
    }
    emitEvent(proof)
    return proof
  }

  if (domain.status !== "ready") {
    const proof: RequestProof = {
      requestId,
      domainId: domain.id,
      hostname: normalized.hostname,
      path: normalized.path,
      timestamp,
      revisionId: activeRevision.id,
      cacheStatus: "BLOCKED_PENDING",
      finalDisposition: "blocked",
      bytesServed: 0,
      quotaUsedBytes: getState().quotaUsedBytes,
      quotaLimitBytes: getState().quotaLimitBytes,
      message: "Domain is still pending setup. Live traffic proof is disabled in this state.",
    }
    emitEvent(proof)
    return proof
  }

  const usageBefore = getUsageState()
  if (usageBefore.reached) {
    const proof: RequestProof = {
      requestId,
      domainId: domain.id,
      hostname: normalized.hostname,
      path: normalized.path,
      timestamp,
      revisionId: activeRevision.id,
      cacheStatus: "BLOCKED_QUOTA",
      finalDisposition: "blocked",
      bytesServed: 0,
      quotaUsedBytes: usageBefore.usedBytes,
      quotaLimitBytes: usageBefore.limitBytes,
      message: "Free plan bandwidth reached. Add more balance before serving more traffic.",
    }
    emitEvent(proof)
    return proof
  }

  let cacheStatus: RequestProof["cacheStatus"] = "BYPASS"
  let bytesServed = 0

  if (activeRevision.cacheEnabled) {
    const cached = readCache(domain.id, normalized.path, activeRevision.id)
    if (cached) {
      cacheStatus = "HIT"
      bytesServed = cached.bytesServed
    } else {
      const origin = fetchOriginAsset()
      cacheStatus = "MISS"
      bytesServed = origin.bytesServed
      writeCache(domain.id, normalized.path, activeRevision.id, origin.bytesServed)
    }
  } else {
    const origin = fetchOriginAsset()
    bytesServed = origin.bytesServed
  }

  const usageAfter = incrementUsage(bytesServed)

  const proof: RequestProof = {
    requestId,
    domainId: domain.id,
    hostname: normalized.hostname,
    path: normalized.path,
    timestamp,
    revisionId: activeRevision.id,
    cacheStatus,
    finalDisposition: "served",
    bytesServed,
    quotaUsedBytes: usageAfter.usedBytes,
    quotaLimitBytes: usageAfter.limitBytes,
    message:
      cacheStatus === "HIT"
        ? "Served directly from edge cache."
        : cacheStatus === "MISS"
          ? "Origin fetched once and cached at the edge."
          : "Served from origin because cache policy is disabled.",
  }

  emitEvent(proof)
  return proof
}
