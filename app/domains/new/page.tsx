import React, { Suspense } from "react"
import { redirect } from "next/navigation"
import { NewDomainForm } from "../../../components/demo/new-domain-form"
import { loginPath } from "../../../lib/auth/navigation"
import { getSession } from "../../../lib/auth/session"
import { fetchEdgeNodes } from "../../../lib/demo/service-client"

export default async function NewDomainPage() {
  const session = await getSession()
  if (!session) {
    redirect(loginPath("/domains/new"))
  }

  const edgeNodes = await fetchEdgeNodes()

  return (
    <Suspense fallback={<div className="surface stack">Loading onboarding form...</div>}>
      <NewDomainForm edgeNodes={edgeNodes} />
    </Suspense>
  )
}
