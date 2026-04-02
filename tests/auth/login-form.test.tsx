import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { LoginForm } from "../../components/auth/login-form"

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react")

  return {
    ...actual,
    useActionState: () => [{}, vi.fn(), false],
  }
})

describe("login form", () => {
  it("renders a hidden next field when preserving intent", () => {
    render(<LoginForm nextPath="/domains/new" />)

    expect(screen.getByDisplayValue("/domains/new")).toHaveAttribute("type", "hidden")
  })

  it("uses the tighter product copy", () => {
    render(<LoginForm />)

    expect(screen.getByText("Open the CDN workspace")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
  })
})
