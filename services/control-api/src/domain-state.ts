import { getState, setState } from "../../../lib/demo/demo-store"
import type { DomainRecord } from "../../shared/src/types"

function createBaselineRevision() {
  return {
    id: "rev-1",
    cacheEnabled: false,
    label: "Baseline - origin fetch only",
    createdAt: new Date().toISOString(),
  }
}

export function listDomains() {
  return getState().domains
}

export function getDomain(domainId: string) {
  return getState().domains.find((domain) => domain.id === domainId) ?? null
}

export function createDomain(input: { hostname: string; mode: "ready" | "pending" }) {
  const baseline = createBaselineRevision()
  const domain: DomainRecord = {
    id: `zone-${Math.random().toString(36).slice(2, 8)}`,
    hostname: input.hostname,
    origin: "demo-origin.internal",
    status: input.mode,
    readinessNote:
      input.mode === "ready"
        ? "Pre-verified domain ready for live traffic proof."
        : "Onboarding instructions shown only. Traffic is not live in this state.",
    truthLabel: input.mode === "ready" ? "live-proof" : "seeded-demo-data",
    activeRevisionId: baseline.id,
    appliedRevisionId: baseline.id,
    revisions: [baseline],
  }

  setState((state) => ({
    ...state,
    domains: [...state.domains, domain],
    activeDomainId: domain.id,
  }))

  return domain
}

export function setActiveDomain(domainId: string) {
  setState((state) => ({ ...state, activeDomainId: domainId }))
}
