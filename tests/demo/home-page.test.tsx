import React from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import HomePage from "../../app/page"

const getSession = vi.fn()
const fetchDashboardSnapshot = vi.fn()

vi.mock("../../lib/auth/session", () => ({
  getSession: () => getSession(),
}))

vi.mock("../../lib/demo/service-client", () => ({
  fetchDashboardSnapshot: () => fetchDashboardSnapshot(),
}))

describe("home page", () => {
  beforeEach(() => {
    getSession.mockReset()
    fetchDashboardSnapshot.mockReset()
  })

  it("renders the marketing hero when signed out", async () => {
    getSession.mockResolvedValue(null)

    render(await HomePage())

    expect(screen.getByText("Launch pull zones fast.")).toBeInTheDocument()
    expect(screen.getByText("Run the proof loop")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Create first site" })).toHaveAttribute(
      "href",
      "/login?next=%2Fdomains%2Fnew",
    )
    expect(fetchDashboardSnapshot).not.toHaveBeenCalled()
  })

  it("renders the overview workspace when signed in", async () => {
    getSession.mockResolvedValue({ email: "hello@northstar.test" })
    fetchDashboardSnapshot.mockResolvedValue({
      domains: [
        {
          id: "zone-1",
          hostname: "ready-site.unseencdn.test",
          projectName: "Marketing site",
          origin: "demo-origin.internal",
          setupPath: "existing-origin",
          setupStage: "ready",
          originStatus: "healthy",
          dnsStatus: "verified",
          status: "ready",
          readinessNote: "Ready for proof.",
          truthLabel: "live-proof",
          activeRevisionId: "rev-1",
          appliedRevisionId: "rev-1",
          revisions: [{ id: "rev-1", cacheEnabled: false, label: "Baseline", createdAt: new Date().toISOString() }],
          dnsRecords: [],
          proxyMode: "proxied",
          routeHint: "/",
        },
      ],
      events: [
          {
            requestId: "req-1",
            traceId: "trace-1",
            domainId: "zone-1",
            hostname: "ready-site.unseencdn.test",
            path: "/",
          timestamp: new Date().toISOString(),
          revisionId: "rev-1",
          cacheStatus: "HIT",
          finalDisposition: "served",
          bytesServed: 1024,
          quotaUsedBytes: 2048,
          quotaLimitBytes: 10000,
          message: "Served from cache.",
        },
      ],
      analytics: {
        totalRequests: 12,
        servedRequests: 12,
        blockedRequests: 0,
        bandwidthBytes: 4096,
        cacheHits: 10,
        cacheMisses: 2,
        cacheBypass: 0,
        hitRatio: 0.83,
        cacheValueBytes: 3072,
        quotaUsedBytes: 2048,
        quotaLimitBytes: 10000,
        quotaReached: false,
        freshness: "live",
      },
      quota: {
        usedBytes: 2048,
        limitBytes: 10000,
        reached: false,
        remainingBytes: 7952,
        percentUsed: 20,
      },
    })

    render(await HomePage())

    expect(screen.getByText("Resume work across your pull zones")).toBeInTheDocument()
    expect(screen.getByText("Recent zones")).toBeInTheDocument()
    expect(screen.getByText("Recent request outcome")).toBeInTheDocument()
    expect(screen.queryByText("Launch pull zones fast.")).not.toBeInTheDocument()
    expect(fetchDashboardSnapshot).toHaveBeenCalledTimes(1)
  })
})
