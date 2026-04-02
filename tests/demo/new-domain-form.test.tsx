import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NewDomainForm } from "../../components/demo/new-domain-form"

const edgeNodes = [
  { id: "edge-us-east", label: "US East", region: "us-east", verificationPath: "/edge-nodes/edge-us-east" },
  { id: "edge-eu-west", label: "EU West", region: "eu-west", verificationPath: "/edge-nodes/edge-eu-west" },
] as const

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
    render(<NewDomainForm edgeNodes={[...edgeNodes]} />)

    expect(screen.getByText("Create a new pull zone")).toBeInTheDocument()
    expect(screen.getByText("Deploying to all 2 eligible edge nodes")).toBeInTheDocument()
    expect(screen.getByLabelText("Zone name")).toBeInTheDocument()
    expect(screen.getByLabelText("Hostname")).toBeInTheDocument()
    expect(screen.getByLabelText("Origin URL")).toBeInTheDocument()
    expect(screen.getByLabelText("Health check path")).toBeInTheDocument()
    expect(screen.getByText("Create pull zone")).toBeInTheDocument()
    expect(screen.queryByLabelText("Initial verification state")).not.toBeInTheDocument()
  })

  it("uses the ready hostname by default", () => {
    render(<NewDomainForm edgeNodes={[...edgeNodes]} />)

    expect(screen.getByDisplayValue("ready-site.unseencdn.test")).toBeInTheDocument()
  })

  it("keeps the public-origin defaults in the simplified form", () => {
    render(<NewDomainForm edgeNodes={[...edgeNodes]} />)

    expect(screen.getByDisplayValue("https://static.example.com")).toBeInTheDocument()
    expect(screen.getByDisplayValue("/")).toBeInTheDocument()
  })

  it("keeps the existing-origin health check default focused on public sites", () => {
    render(<NewDomainForm edgeNodes={[...edgeNodes]} />)

    expect(screen.getByDisplayValue("/")).toBeInTheDocument()
  })

  it("shows subset selection only after opening advanced edge placement options", () => {
    render(<NewDomainForm edgeNodes={[...edgeNodes]} />)

    expect(screen.queryByLabelText(/Only selected edge nodes/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByText("Choose specific edge nodes"))
    expect(screen.getByLabelText(/Only selected edge nodes/i)).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText(/Only selected edge nodes/i))
    expect(screen.getByLabelText(/US East/i)).toBeInTheDocument()
  })

  it("updates the placement summary when a subset is selected", () => {
    render(<NewDomainForm edgeNodes={[...edgeNodes]} />)

    fireEvent.click(screen.getByText("Choose specific edge nodes"))
    fireEvent.click(screen.getByLabelText(/Only selected edge nodes/i))
    fireEvent.click(screen.getByLabelText(/US East/i))

    expect(screen.getByText("Deploying to 1 selected edge node")).toBeInTheDocument()
  })
})
