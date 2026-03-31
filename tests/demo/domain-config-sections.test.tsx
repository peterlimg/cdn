import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { DomainConfigSections } from "../../components/demo/domain-config-sections"

describe("domain config sections", () => {
  it("shows the real proxied asset check url for the current domain", () => {
    render(
      <DomainConfigSections
        domainId="zone-123"
        origin="http://ui:3000/origin"
        dnsRecords={[]}
        proxyMode="proxied"
        routeHint="/assets/demo.css"
      />,
    )

    expect(screen.getByText(/Real edge check:/)).toBeInTheDocument()
    expect(screen.getByText("/api/proxy-check?domainId=zone-123&path=%2Fassets%2Fdemo.css")).toBeInTheDocument()
    expect(screen.getByText(/X-Cache-Status/)).toBeInTheDocument()
  })
})
