"use server"

import { redirect } from "next/navigation"
import { sanitizeNextPath } from "../../lib/auth/navigation"
import { clearSession, createSession } from "../../lib/auth/session"

export type AuthActionState = {
  error?: string
}

export async function loginAction(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const nextPath = sanitizeNextPath(String(formData.get("next") ?? "")) ?? "/"

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  if (!email.includes("@")) {
    return { error: "Enter a valid email address." }
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." }
  }

  await createSession(email)
  redirect(nextPath)
}

export async function logoutAction() {
  await clearSession()
  redirect("/login")
}
