import React from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { DomainsShell } from "../../components/demo/domains-shell"
import type { DashboardSnapshot, DomainRecord } from "../../services/shared/src/types"

describe("domains dashboard", () => {
  let domains: DomainRecord[]
  let snapshot: DashboardSnapshot

  beforeEach(() => {
    domains = []
    snapshot = {
      domains,
      events: [],
      analytics: {
        totalRequests: 0,
        servedRequests: 0,
        blockedRequests: 0,
        bandwidthBytes: 0,
        cacheHits: 0,
        cacheMisses: 0,
        cacheBypass: 0,
        hitRatio: 0,
        cacheValueBytes: 0,
        quotaUsedBytes: 0,
        quotaLimitBytes: 10_000,
        quotaReached: false,
        freshness: "live",
      },
      quota: {
        usedBytes: 0,
        limitBytes: 10_000,
        reached: false,
        remainingBytes: 10_000,
        percentUsed: 0,
      },
    }
  })

  it("shows empty-state guidance before any domains exist", () => {
    render(<DomainsShell snapshot={snapshot} />)
    expect(screen.getByText("No pull zones yet")).toBeInTheDocument()
    expect(screen.getByText("All sites")).toBeInTheDocument()
  })

  it("renders the created domain and readiness state", () => {
    domains = [
      {
        id: "zone-1",
        hostname: "ready-site.northstarcdn.test",
        projectName: "Marketing site",
        origin: "demo-origin.internal",
        setupPath: "existing-origin",
        setupStage: "ready",
        originStatus: "healthy",
        dnsStatus: "verified",
        status: "ready",
        readinessNote: "Pre-verified domain ready for live traffic proof.",
        truthLabel: "live-proof",
        activeRevisionId: "rev-1",
        appliedRevisionId: "rev-1",
        revisions: [{ id: "rev-1", cacheEnabled: false, label: "Baseline - origin fetch only", createdAt: new Date().toISOString() }],
        dnsRecords: [],
        proxyMode: "proxied",
        routeHint: "/assets/site.css",
      },
    ]
    snapshot = {
      ...snapshot,
      domains,
      analytics: {
        ...snapshot.analytics,
        totalRequests: 18,
      },
      quota: {
        ...snapshot.quota,
        usedBytes: 1800,
        remainingBytes: 8200,
        percentUsed: 18,
      },
    }

    render(<DomainsShell snapshot={snapshot} />)

    expect(screen.getByText("ready-site.northstarcdn.test")).toBeInTheDocument()
    expect(screen.getByText("Ready to activate")).toBeInTheDocument()
    expect(screen.getAllByText("Marketing site")).toHaveLength(2)
    expect(screen.getByText("Every hostname on the edge")).toBeInTheDocument()
    expect(screen.getByText("Ready sites to validate")).toBeInTheDocument()
  })
})
