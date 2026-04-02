import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ZoneDetailShell } from "../../components/demo/zone-detail-shell"
import type { AnalyticsSummary, DomainRecord, RequestProof, ServiceLog } from "../../services/shared/src/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const domain: DomainRecord = {
  id: "zone-1",
  hostname: "ready-demo.northstarcdn.test",
  projectName: "Marketing site",
  origin: "https://static.example.com",
  healthCheckPath: "/",
  setupPath: "existing-origin",
  setupStage: "ready",
  originStatus: "healthy",
  dnsStatus: "verified",
  status: "ready",
  readinessNote: "Origin and verification checks have passed.",
  truthLabel: "live-proof",
  activeRevisionId: "rev-2",
  appliedRevisionId: "rev-1",
  revisions: [{ id: "rev-2", cacheEnabled: true, label: "Cache enabled", createdAt: "2026-04-01T00:00:00Z" }],
  dnsRecords: [],
  proxyMode: "proxied",
  routeHint: "/assets/demo.css",
  edgePlacement: {
    mode: "subset",
    selectedNodeIds: ["edge-us-east", "edge-eu-west"],
    targetNodeIds: ["edge-us-east", "edge-eu-west"],
    summary: "Deploying to 2 selected edge nodes",
  },
  edgeRollout: {
    status: "partial",
    targetNodeCount: 2,
    pendingNodeCount: 1,
    appliedNodeCount: 1,
    failedNodeCount: 0,
    nodes: [
      {
        nodeId: "edge-us-east",
        label: "US East",
        region: "us-east",
        verificationPath: "/edge-nodes/edge-us-east",
        status: "applied",
        appliedRevisionId: "rev-2",
      },
      {
        nodeId: "edge-eu-west",
        label: "EU West",
        region: "eu-west",
        verificationPath: "/edge-nodes/edge-eu-west",
        status: "pending",
      },
    ],
  },
}

const summary: AnalyticsSummary = {
  totalRequests: 1,
  servedRequests: 1,
  blockedRequests: 0,
  bandwidthBytes: 128,
  cacheHits: 1,
  cacheMisses: 0,
  cacheBypass: 0,
  hitRatio: 1,
  cacheValueBytes: 128,
  quotaUsedBytes: 128,
  quotaLimitBytes: 1000,
  quotaReached: false,
  freshness: "live",
}

const proofs: RequestProof[] = [
  {
    requestId: "req-1",
    traceId: "trace-1",
    domainId: "zone-1",
    hostname: "ready-demo.northstarcdn.test",
    path: "/assets/demo.css",
    timestamp: "2026-04-01T00:00:00Z",
    revisionId: "rev-2",
    cacheStatus: "HIT",
    finalDisposition: "served",
    bytesServed: 128,
    quotaUsedBytes: 128,
    quotaLimitBytes: 1000,
    message: "served from cache",
    servedByNodeId: "edge-us-east",
    servedByNodeLabel: "US East",
    servedByRegion: "us-east",
  },
]

const edgeLogs: ServiceLog[] = []
const apiLogs: ServiceLog[] = []

describe("zone detail shell", () => {
  it("shows placement scope, rollout counts, and node-specific proof controls", () => {
    render(
      <ZoneDetailShell
        domain={domain}
        summary={summary}
        events={proofs}
        edgeLogs={edgeLogs}
        apiLogs={apiLogs}
      />,
    )

    expect(screen.getByText("Where this zone should run")).toBeInTheDocument()
    expect(screen.getByText("Deploying to 2 selected edge nodes")).toBeInTheDocument()
    expect(screen.getByText("Targets: 2")).toBeInTheDocument()
    expect(screen.getByText("Applied: 1")).toBeInTheDocument()
    expect(screen.getByText("Pending: 1")).toBeInTheDocument()
    expect(screen.getByText("Rollout: Targets 2, applied 1, pending 1, failed 0")).toBeInTheDocument()
    expect(screen.getByText("US East")).toBeInTheDocument()
    expect(screen.getByText("EU West")).toBeInTheDocument()
    expect(screen.getByText(/Served by: US East/)).toBeInTheDocument()
    expect(screen.getByText("Verify US East")).toBeInTheDocument()
    expect(screen.getByText("Verify EU West")).toBeInTheDocument()
  })
})
