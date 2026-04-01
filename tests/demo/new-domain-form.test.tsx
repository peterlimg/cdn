import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NewDomainForm } from "../../components/demo/new-domain-form"

const push = vi.fn()
const refresh = vi.fn()
let searchMode = "ready"
let searchSetupPath: string | null = null
let searchDeploy: string | null = null

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === "mode") return searchMode
      if (key === "setupPath") return searchSetupPath
      if (key === "deploy") return searchDeploy
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
    searchDeploy = null
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
  })

  it("renders project and origin fields for real site setup", () => {
    render(<NewDomainForm />)

    expect(screen.getByLabelText("Project name")).toBeInTheDocument()
    expect(screen.getByLabelText("Origin URL")).toBeInTheDocument()
    expect(screen.getByText("Create site and continue setup")).toBeInTheDocument()
  })

  it("shows the separate static deployment copy when deploy mode is selected", () => {
    searchDeploy = "static"

    render(<NewDomainForm />)

    expect(screen.getByText("Deploy a static site onto the network")).toBeInTheDocument()
    expect(screen.getByDisplayValue("http://ready-origin:80")).toBeInTheDocument()
    expect(screen.getByText(/Separate deploy flow:/)).toBeInTheDocument()
  })
})
