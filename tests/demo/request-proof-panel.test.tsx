import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { RequestProofPanel } from "../../components/demo/request-proof-panel"

describe("request proof panel", () => {
  it("uses blocked-proof language for pending domains", () => {
    render(<RequestProofPanel domainId="zone-1" domainStatus="pending" initialProofs={[]} />)

    expect(screen.getByText("Blocked proof")).toBeInTheDocument()
    expect(screen.getByText("Show blocked request proof")).toBeInTheDocument()
    expect(screen.getByText(/No blocked proof yet/)).toBeInTheDocument()
  })
})
