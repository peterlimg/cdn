import { beforeEach, describe, expect, it } from "vitest"
import { getAnalyticsSummary } from "../../services/analytics/src/usage-rollups"
import { createDomain, publishCachePolicy } from "../../services/control-api/src/server"
import { evaluateRequest } from "../../services/edge-demo/src/server"
import { resetDemoState } from "../../lib/demo/demo-store"

describe("cache value summary", () => {
  beforeEach(() => {
    resetDemoState()
  })

  it("counts cached bytes as offload value", () => {
    const domain = createDomain({ hostname: "ready-demo.unseencdn.test", mode: "ready" })
    publishCachePolicy(domain.id, true)

    evaluateRequest({ domainId: domain.id })
    const hit = evaluateRequest({ domainId: domain.id })

    const summary = getAnalyticsSummary(domain.id)
    expect(summary.cacheValueBytes).toBe(hit.bytesServed)
  })
})
