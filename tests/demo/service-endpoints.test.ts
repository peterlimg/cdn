import { afterEach, describe, expect, it } from "vitest"
import { getEdgeNodeUrl } from "../../lib/demo/service-endpoints"

const originalRustEdgeUrl = process.env["RUST_EDGE_URL"]

describe("service endpoints", () => {
  afterEach(() => {
    if (originalRustEdgeUrl === undefined) {
      delete process.env["RUST_EDGE_URL"]
      return
    }

    process.env["RUST_EDGE_URL"] = originalRustEdgeUrl
  })

  it("builds node-specific routes from the nginx edge base path", () => {
    process.env["RUST_EDGE_URL"] = "http://nginx:8080/edge"

    expect(getEdgeNodeUrl()).toBe("http://nginx:8080/edge")
    expect(getEdgeNodeUrl("edge-eu-west")).toBe("http://nginx:8080/edge-nodes/edge-eu-west")
  })
})
