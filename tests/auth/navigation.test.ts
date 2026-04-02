import { describe, expect, it } from "vitest"
import { loginPath, sanitizeNextPath } from "../../lib/auth/navigation"

describe("auth navigation helpers", () => {
  it("keeps safe internal next paths", () => {
    expect(sanitizeNextPath("/domains/new?mode=ready")).toBe("/domains/new?mode=ready")
  })

  it("rejects external or malformed next paths", () => {
    expect(sanitizeNextPath("https://langfuse.com")).toBeNull()
    expect(sanitizeNextPath("//evil.example.com")).toBeNull()
    expect(sanitizeNextPath("domains/new")).toBeNull()
  })

  it("builds login URLs with preserved next paths", () => {
    expect(loginPath("/domains/new")).toBe("/login?next=%2Fdomains%2Fnew")
    expect(loginPath(null)).toBe("/login")
  })
})
