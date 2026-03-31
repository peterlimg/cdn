import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NewDomainForm } from "../../components/demo/new-domain-form"

const push = vi.fn()
const refresh = vi.fn()
let searchMode = "ready"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => ({ get: (key: string) => (key === "mode" ? searchMode : null) }),
}))

describe("new domain form", () => {
  beforeEach(() => {
    push.mockReset()
    refresh.mockReset()
    searchMode = "ready"
  })

  it("preserves a typed hostname when readiness mode changes", () => {
    render(<NewDomainForm />)

    const hostname = screen.getByLabelText("Hostname")
    const mode = screen.getByLabelText("Readiness mode")

    fireEvent.change(hostname, { target: { value: "custom-demo.example.test" } })
    fireEvent.change(mode, { target: { value: "pending" } })

    expect(screen.getByDisplayValue("custom-demo.example.test")).toBeInTheDocument()
  })

  it("uses the default hostname when the form has not been customized", () => {
    render(<NewDomainForm />)

    fireEvent.change(screen.getByLabelText("Readiness mode"), { target: { value: "pending" } })

    expect(screen.getByDisplayValue("pending-demo.northstarcdn.test")).toBeInTheDocument()
  })
})
