import { beforeEach, describe, expect, it } from "vitest"
import { createDomain, getDomain, publishCachePolicy, rollbackCachePolicy } from "../../services/control-api/src/server"
import { resetDemoState } from "../../lib/demo/demo-store"

describe("policy publish", () => {
  beforeEach(() => {
    resetDemoState()
  })

  it("publishes a new cache-enabled revision and marks it applied", () => {
    const domain = createDomain({ hostname: "ready-demo.northstarcdn.test", mode: "ready" })
    const revision = publishCachePolicy(domain.id, true)
    const updated = getDomain(domain.id)

    expect(revision).not.toBeNull()
    expect(revision?.cacheEnabled).toBe(true)
    expect(updated?.activeRevisionId).toBe(revision?.id)
    expect(updated?.appliedRevisionId).toBe(revision?.id)
  })

  it("rolls back to the baseline uncached revision", () => {
    const domain = createDomain({ hostname: "ready-demo.northstarcdn.test", mode: "ready" })
    publishCachePolicy(domain.id, true)
    const baseline = rollbackCachePolicy(domain.id)
    const updated = getDomain(domain.id)

    expect(baseline).not.toBeNull()
    expect(baseline?.cacheEnabled).toBe(false)
    expect(updated?.activeRevisionId).toBe(baseline?.id)
  })
})
