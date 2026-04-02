import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { EvidenceTabs } from "../../components/demo/evidence-tabs"
import type { RequestProof, ServiceLog } from "../../services/shared/src/types"

const proofs: RequestProof[] = [
  {
    requestId: "req-1",
    traceId: "trace-1",
    domainId: "zone-1",
    hostname: "ready-demo.northstarcdn.test",
    path: "/",
    timestamp: "2026-04-01T00:00:00Z",
    revisionId: "rev-2",
    cacheStatus: "MISS",
    finalDisposition: "served",
    bytesServed: 128,
    quotaUsedBytes: 128,
    quotaLimitBytes: 1000,
    message: "served via miss",
    servedByNodeId: "edge-eu-west",
    servedByNodeLabel: "EU West",
    servedByRegion: "eu-west",
  },
]

const edgeLogs: ServiceLog[] = [
  {
    id: "edge-log-1",
    service: "edge",
    level: "INFO",
    requestId: "req-1",
    traceId: "trace-1",
    domainId: "zone-1",
    revisionId: "rev-2",
    event: "request-served",
    outcome: "ok",
    message: "served from eu west",
    timestamp: "2026-04-01T00:00:00Z",
    nodeId: "edge-eu-west",
    nodeLabel: "EU West",
    nodeRegion: "eu-west",
  },
]

const apiLogs: ServiceLog[] = [
  {
    id: "api-log-1",
    service: "api",
    level: "INFO",
    requestId: "req-1",
    traceId: "trace-1",
    domainId: "zone-1",
    revisionId: "rev-2",
    event: "evidence-ingested",
    outcome: "stored",
    message: "ingested node-attributed proof",
    timestamp: "2026-04-01T00:00:01Z",
    nodeId: "edge-eu-west",
    nodeLabel: "EU West",
    nodeRegion: "eu-west",
  },
]

describe("evidence tabs", () => {
  it("switches between proof and node-attributed log views", () => {
    render(
      <EvidenceTabs
        domainId="zone-1"
        domainStatus="ready"
        routeHint="/"
        initialProofs={proofs}
        initialEdgeLogs={edgeLogs}
        initialApiLogs={apiLogs}
      />,
    )

    expect(screen.getByText("req-1")).toBeInTheDocument()
    expect(screen.getByText(/Served by: EU West/)).toBeInTheDocument()

    fireEvent.click(screen.getByText("Rust edge logs"))
    expect(screen.getByText("Why the edge served, cached, or blocked")).toBeInTheDocument()
    expect(screen.getByText("request-served")).toBeInTheDocument()
    expect(screen.getByText("Node: EU West")).toBeInTheDocument()

    fireEvent.click(screen.getByText("Go API logs"))
    expect(screen.getByText("Why the control plane did or did not participate")).toBeInTheDocument()
    expect(screen.getByText("evidence-ingested")).toBeInTheDocument()
    expect(screen.getByText("Node: EU West")).toBeInTheDocument()
  })
})
