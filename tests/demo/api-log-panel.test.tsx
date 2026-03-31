import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ApiLogPanel } from "../../components/demo/api-log-panel"

describe("api log panel", () => {
  it("describes guaranteed control-plane participation without expected-empty wording", () => {
    render(<ApiLogPanel logs={[]} />)

    expect(screen.getByText(/each request still produces control-plane participation/i)).toBeInTheDocument()
    expect(screen.queryByText(/Expected empty/i)).not.toBeInTheDocument()
  })
})
