import React, { Suspense } from "react"
import { redirect } from "next/navigation"
import { NewDomainForm } from "../../../components/demo/new-domain-form"
import { getSession } from "../../../lib/auth/session"

export default async function NewDomainPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  return (
    <Suspense fallback={<div className="card stack">Loading onboarding form...</div>}>
      <NewDomainForm />
    </Suspense>
  )
}
