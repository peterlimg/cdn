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

  it("renders a simplified pull-zone style form", () => {
    render(<NewDomainForm />)

    expect(screen.getByText("Create a new pull zone")).toBeInTheDocument()
    expect(screen.getByLabelText("Zone name")).toBeInTheDocument()
    expect(screen.getByLabelText("Hostname")).toBeInTheDocument()
    expect(screen.getByLabelText("Origin URL")).toBeInTheDocument()
    expect(screen.getByLabelText("Health check path")).toBeInTheDocument()
    expect(screen.getByText("Create pull zone")).toBeInTheDocument()
    expect(screen.queryByLabelText("Initial verification state")).not.toBeInTheDocument()
  })

  it("uses the ready hostname by default", () => {
    render(<NewDomainForm />)

    expect(screen.getByDisplayValue("ready-site.northstarcdn.test")).toBeInTheDocument()
  })

	it("keeps the public-origin defaults in the simplified form", () => {
		render(<NewDomainForm />)

		expect(screen.getByDisplayValue("https://static.example.com")).toBeInTheDocument()
		expect(screen.getByDisplayValue("/")).toBeInTheDocument()
	})

  it("keeps the existing-origin health check default focused on public sites", () => {
    render(<NewDomainForm />)

    expect(screen.getByDisplayValue("/")).toBeInTheDocument()
  })
})
