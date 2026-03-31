import React, { Suspense } from "react"
import { NewDomainForm } from "../../../components/demo/new-domain-form"

export default function NewDomainPage() {
  return (
    <Suspense fallback={<div className="card stack">Loading onboarding form...</div>}>
      <NewDomainForm />
    </Suspense>
  )
}
