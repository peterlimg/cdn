import { beforeEach, describe, expect, it } from "vitest"
import { getAnalyticsSummary } from "../../services/analytics/src/usage-rollups"
import { createDomain, publishCachePolicy } from "../../services/control-api/src/server"
import { evaluateRequest } from "../../services/edge-demo/src/server"
import { resetDemoState } from "../../lib/demo/demo-store"

describe("analytics story", () => {
  beforeEach(() => {
    resetDemoState()
  })

  it("tracks totals and hit ratio from emitted request events", () => {
    const domain = createDomain({ hostname: "ready-demo.northstarcdn.test", mode: "ready" })
    publishCachePolicy(domain.id, true)

    evaluateRequest({ domainId: domain.id })
    evaluateRequest({ domainId: domain.id })

    const summary = getAnalyticsSummary(domain.id)

    expect(summary.totalRequests).toBe(2)
    expect(summary.cacheMisses).toBe(1)
    expect(summary.cacheHits).toBe(1)
    expect(summary.hitRatio).toBeGreaterThan(0)
  })
})
