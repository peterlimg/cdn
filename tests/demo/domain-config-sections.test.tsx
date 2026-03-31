import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DomainConfigSections } from "../../components/demo/domain-config-sections"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

describe("domain config sections", () => {
  it("shows the real proxied asset check url for the current domain", () => {
    render(
      <DomainConfigSections
        domainId="zone-123"
        projectName="Marketing site"
        origin="http://ui:3000/origin"
        setupPath="simple-static"
        setupStage="origin-configured"
        originStatus="healthy"
        originValidationMessage="Origin format looks valid for CDN routing."
        lastOriginCheckAt="2026-03-31T23:22:00Z"
        lastOriginCheckOutcome="healthy"
        dnsStatus="verified"
        dnsRecords={[]}
        proxyMode="proxied"
        routeHint="/assets/demo.css"
      />,
    )

    expect(screen.getByText(/Real edge check:/)).toBeInTheDocument()
    expect(screen.getByText("/api/proxy-check?domainId=zone-123&path=%2Fassets%2Fdemo.css")).toBeInTheDocument()
    expect(screen.getByText(/X-Cache-Status/)).toBeInTheDocument()
    expect(screen.getByText(/Origin status: healthy/)).toBeInTheDocument()
    expect(screen.getByText(/Last origin check: healthy at 2026-03-31T23:22:00Z/)).toBeInTheDocument()
    expect(screen.getByText("Origin format looks valid for CDN routing.")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Marketing site")).toBeInTheDocument()
    expect(screen.getByText("Re-run origin check")).toBeInTheDocument()
    expect(screen.getByText("DNS verified")).toBeInTheDocument()
  })
})
