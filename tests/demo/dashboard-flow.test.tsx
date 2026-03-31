import React from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { DomainsShell } from "../../components/demo/domains-shell"
import type { DomainRecord } from "../../services/shared/src/types"

describe("domains dashboard", () => {
  let domains: DomainRecord[]

  beforeEach(() => {
    domains = []
  })

  it("shows empty-state guidance before any domains exist", () => {
    render(<DomainsShell domains={domains} />)
    expect(screen.getByText("No domains yet")).toBeInTheDocument()
  })

  it("renders the created domain and readiness state", () => {
    domains = [
      {
        id: "zone-1",
        hostname: "ready-demo.northstarcdn.test",
        origin: "demo-origin.internal",
        status: "ready",
        readinessNote: "Pre-verified demo domain ready for live traffic proof.",
        truthLabel: "live-proof",
        activeRevisionId: "rev-1",
        appliedRevisionId: "rev-1",
        revisions: [{ id: "rev-1", cacheEnabled: false, label: "Baseline - origin fetch only", createdAt: new Date().toISOString() }],
        dnsRecords: [],
        proxyMode: "proxied",
        routeHint: "/assets/demo.css",
      },
    ]

    render(<DomainsShell domains={domains} />)

    expect(screen.getByText("ready-demo.northstarcdn.test")).toBeInTheDocument()
    expect(screen.getByText("Ready for live proof")).toBeInTheDocument()
  })
})
