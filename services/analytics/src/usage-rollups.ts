import type { AnalyticsSummary } from "../../shared/src/types"
import { listEvents } from "./event-ingest"
import { getUsageState } from "../../control-api/src/server"

export function getAnalyticsSummary(domainId?: string): AnalyticsSummary {
  const events = listEvents(domainId)
  const usage = getUsageState()

  const servedEvents = events.filter((event) => event.finalDisposition === "served")
  const blockedEvents = events.filter((event) => event.finalDisposition === "blocked")
  const cacheHits = events.filter((event) => event.cacheStatus === "HIT").length
  const cacheMisses = events.filter((event) => event.cacheStatus === "MISS").length
  const cacheBypass = events.filter((event) => event.cacheStatus === "BYPASS").length
  const bandwidthBytes = servedEvents.reduce((sum, event) => sum + event.bytesServed, 0)
  const hitBytes = events
    .filter((event) => event.cacheStatus === "HIT")
    .reduce((sum, event) => sum + event.bytesServed, 0)

  return {
    totalRequests: events.length,
    servedRequests: servedEvents.length,
    blockedRequests: blockedEvents.length,
    bandwidthBytes,
    cacheHits,
    cacheMisses,
    cacheBypass,
    hitRatio: events.length === 0 ? 0 : cacheHits / Math.max(cacheHits + cacheMisses + cacheBypass, 1),
    cacheValueBytes: hitBytes,
    quotaUsedBytes: usage.usedBytes,
    quotaLimitBytes: usage.limitBytes,
    quotaReached: usage.reached,
    freshness: "live",
  }
}
