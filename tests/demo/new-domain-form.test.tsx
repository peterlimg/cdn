import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NewDomainForm } from "../../components/demo/new-domain-form"

const push = vi.fn()
const refresh = vi.fn()
let searchMode = "ready"
let searchSetupPath: string | null = null

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === "mode") return searchMode
      if (key === "setupPath") return searchSetupPath
      return null
    },
  }),
}))

describe("new domain form", () => {
  beforeEach(() => {
    push.mockReset()
    refresh.mockReset()
    searchMode = "ready"
    searchSetupPath = null
  })

  it("preserves a typed hostname when readiness mode changes", () => {
    render(<NewDomainForm />)

    const hostname = screen.getByLabelText("Hostname")
    const mode = screen.getByLabelText("Initial verification state")

    fireEvent.change(hostname, { target: { value: "custom-demo.example.test" } })
    fireEvent.change(mode, { target: { value: "pending" } })

    expect(screen.getByDisplayValue("custom-demo.example.test")).toBeInTheDocument()
  })

  it("uses the default hostname when the form has not been customized", () => {
    render(<NewDomainForm />)

    fireEvent.change(screen.getByLabelText("Initial verification state"), { target: { value: "pending" } })

    expect(screen.getByDisplayValue("pending-demo.northstarcdn.test")).toBeInTheDocument()
  })

  it("switches the origin placeholder value when the setup path changes", () => {
    render(<NewDomainForm />)

    fireEvent.change(screen.getByLabelText("Origin path"), { target: { value: "network-static" } })

    expect(screen.getByDisplayValue("http://ready-origin:80")).toBeInTheDocument()
    expect(screen.getByDisplayValue("/assets/demo.css")).toBeInTheDocument()
  })

  it("renders project and origin fields for real site setup", () => {
    render(<NewDomainForm />)

    expect(screen.getByLabelText("Project name")).toBeInTheDocument()
    expect(screen.getByLabelText("Origin URL")).toBeInTheDocument()
    expect(screen.getByLabelText("Health check path")).toBeInTheDocument()
    expect(screen.getByText("Create site and continue setup")).toBeInTheDocument()
  })
})
