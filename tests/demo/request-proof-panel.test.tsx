import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { RequestProofPanel } from "../../components/demo/request-proof-panel"

describe("request proof panel", () => {
  it("uses blocked-proof language for pending domains", () => {
    render(<RequestProofPanel domainStatus="pending" proofs={[]} isPending={false} onSendRequest={() => {}} />)

    expect(screen.getByText("Blocked proof")).toBeInTheDocument()
    expect(screen.getByText("Show blocked request")).toBeInTheDocument()
    expect(screen.getByText(/This zone is not ready yet/)).toBeInTheDocument()
  })

  it("syncs displayed proofs when the parent rerenders with newer proof data", () => {
    const { rerender } = render(<RequestProofPanel domainStatus="ready" proofs={[]} isPending={false} onSendRequest={() => {}} />)

    rerender(
      <RequestProofPanel
        domainStatus="ready"
        proofs={[
          {
            requestId: "req-123",
            traceId: "trace-123",
            domainId: "zone-1",
            hostname: "ready-site.unseencdn.test",
            path: "/",
            timestamp: new Date("2026-03-31T00:00:00Z").toISOString(),
            revisionId: "rev-1",
            cacheStatus: "MISS",
            finalDisposition: "served",
            bytesServed: 128,
            quotaUsedBytes: 128,
            quotaLimitBytes: 1000,
            message: "served via miss",
            servedByNodeId: "edge-us-east",
            servedByNodeLabel: "US East",
            servedByRegion: "us-east",
          },
        ]}
        rollout={{
          status: "pending",
          targetNodeCount: 1,
          pendingNodeCount: 1,
          appliedNodeCount: 0,
          failedNodeCount: 0,
          nodes: [{
            nodeId: "edge-us-east",
            label: "US East",
            region: "us-east",
            verificationPath: "/edge-nodes/edge-us-east",
            status: "pending",
          }],
        }}
        isPending={false}
        onSendRequest={() => {}}
      />,
    )

    expect(screen.getByText("req-123")).toBeInTheDocument()
    expect(screen.getByText(/served via miss/i)).toBeInTheDocument()
		expect(screen.getByText(/Served by: US East/)).toBeInTheDocument()
		expect(screen.getByText("Verify US East")).toBeInTheDocument()
  })
})
