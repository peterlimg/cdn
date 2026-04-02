import React, { Suspense } from "react"
import { redirect } from "next/navigation"
import { NewDomainForm } from "../../../components/demo/new-domain-form"
import { loginPath } from "../../../lib/auth/navigation"
import { getSession } from "../../../lib/auth/session"

export default async function NewDomainPage() {
  const session = await getSession()
  if (!session) {
    redirect(loginPath("/domains/new"))
  }

  return (
    <Suspense fallback={<div className="surface stack">Loading onboarding form...</div>}>
      <NewDomainForm />
    </Suspense>
  )
}
