import { beforeEach, describe, expect, it } from "vitest"
import { createDomain, publishCachePolicy } from "../../services/control-api/src/server"
import { evaluateRequest } from "../../services/edge-demo/src/server"
import { resetDemoState, setState } from "../../lib/demo/demo-store"

describe("quota enforcement", () => {
  beforeEach(() => {
    resetDemoState()
  })

  it("blocks the next request after the free-plan limit is reached", () => {
    const domain = createDomain({ hostname: "ready-demo.northstarcdn.test", mode: "ready" })
    publishCachePolicy(domain.id, true)

    setState((state) => ({ ...state, quotaUsedBytes: state.quotaLimitBytes }))
    const proof = evaluateRequest({ domainId: domain.id })

    expect(proof.cacheStatus).toBe("BLOCKED_QUOTA")
    expect(proof.finalDisposition).toBe("blocked")
  })
})
