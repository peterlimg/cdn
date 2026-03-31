import { beforeEach, describe, expect, it } from "vitest"
import { createDomain, publishCachePolicy, rollbackCachePolicy } from "../../services/control-api/src/server"
import { evaluateRequest } from "../../services/edge-demo/src/server"
import { resetDemoState } from "../../lib/demo/demo-store"

describe("request proof loop", () => {
  beforeEach(() => {
    resetDemoState()
  })

  it("shows baseline bypass before cache is enabled", () => {
    const domain = createDomain({ hostname: "ready-demo.northstarcdn.test", mode: "ready" })
    const proof = evaluateRequest({ domainId: domain.id })

    expect(proof.cacheStatus).toBe("BYPASS")
    expect(proof.finalDisposition).toBe("served")
  })

  it("changes from miss to hit after enabling cache", () => {
    const domain = createDomain({ hostname: "ready-demo.northstarcdn.test", mode: "ready" })
    publishCachePolicy(domain.id, true)

    const miss = evaluateRequest({ domainId: domain.id })
    const hit = evaluateRequest({ domainId: domain.id })

    expect(miss.cacheStatus).toBe("MISS")
    expect(hit.cacheStatus).toBe("HIT")
    expect(hit.revisionId).toBe(miss.revisionId)
  })

  it("blocks traffic for pending domains", () => {
    const domain = createDomain({ hostname: "pending-demo.northstarcdn.test", mode: "pending" })
    const proof = evaluateRequest({ domainId: domain.id })

    expect(proof.cacheStatus).toBe("BLOCKED_PENDING")
    expect(proof.finalDisposition).toBe("blocked")
  })

  it("returns to bypass after rollback", () => {
    const domain = createDomain({ hostname: "ready-demo.northstarcdn.test", mode: "ready" })
    publishCachePolicy(domain.id, true)
    evaluateRequest({ domainId: domain.id })
    rollbackCachePolicy(domain.id)

    const proof = evaluateRequest({ domainId: domain.id })
    expect(proof.cacheStatus).toBe("BYPASS")
  })
})
