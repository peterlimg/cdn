import React from "react"
import { redirect } from "next/navigation"
import { LoginForm } from "../../components/auth/login-form"
import { getSession } from "../../lib/auth/session"

export default async function LoginPage() {
  const session = await getSession()
  if (session) {
    redirect("/domains")
  }

  return <LoginForm />
}
