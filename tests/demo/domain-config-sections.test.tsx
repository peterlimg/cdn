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
        healthCheckPath="/healthz"
        setupPath="network-static"
        setupStage="origin-configured"
        originStatus="healthy"
        originValidationMessage="Origin format looks valid for CDN routing."
        lastOriginCheckAt="2026-03-31T23:22:00Z"
        lastOriginCheckOutcome="healthy"
        dnsStatus="verified"
        dnsRecords={[]}
        proxyMode="proxied"
		routeHint="/healthz"
      />,
    )

    expect(screen.getByText("Connect your origin")).toBeInTheDocument()
    expect(screen.getByText(/Origin status: healthy/)).toBeInTheDocument()
    expect(screen.getByText(/Last origin check: healthy at 2026-03-31T23:22:00Z/)).toBeInTheDocument()
    expect(screen.getByText("Origin format looks valid for CDN routing.")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Marketing site")).toBeInTheDocument()
    expect(screen.getByDisplayValue("/healthz")).toBeInTheDocument()
    expect(screen.getByText("Health check: /healthz")).toBeInTheDocument()
    expect(screen.getByText("Save origin")).toBeInTheDocument()
    expect(screen.getByText("Check origin")).toBeInTheDocument()
    expect(screen.getByText("DNS verified")).toBeInTheDocument()
  })
})
