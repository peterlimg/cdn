import { beforeEach, describe, expect, it } from "vitest"
import { createDomain, publishCachePolicy, rollbackCachePolicy } from "../../services/control-api/src/server"
import { evaluateRequest } from "../../services/edge-demo/src/server"
import { resetDemoState } from "../../lib/demo/demo-store"

describe("rollback proof", () => {
  beforeEach(() => {
    resetDemoState()
  })

  it("clears cached state so rollback returns to origin behavior", () => {
    const domain = createDomain({ hostname: "ready-demo.northstarcdn.test", mode: "ready" })
    publishCachePolicy(domain.id, true)

    evaluateRequest({ domainId: domain.id })
    evaluateRequest({ domainId: domain.id })
    rollbackCachePolicy(domain.id)
    const proof = evaluateRequest({ domainId: domain.id })

    expect(proof.cacheStatus).toBe("BYPASS")
    expect(proof.revisionId).toBe("rev-1")
  })
})
