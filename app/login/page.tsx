import React from "react"
import { redirect } from "next/navigation"
import { LoginForm } from "../../components/auth/login-form"
import { sanitizeNextPath } from "../../lib/auth/navigation"
import { getSession } from "../../lib/auth/session"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const params = await searchParams
  const nextParam = Array.isArray(params.next) ? params.next[0] : params.next
  const nextPath = sanitizeNextPath(nextParam) ?? "/"
  const session = await getSession()

  if (session) {
    redirect(nextPath)
  }

  return <LoginForm nextPath={nextPath === "/" ? null : nextPath} />
}
