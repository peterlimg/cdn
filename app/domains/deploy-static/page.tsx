import React, { Suspense } from "react"
import { redirect } from "next/navigation"
import { NewDomainForm } from "../../../components/demo/new-domain-form"
import { getSession } from "../../../lib/auth/session"

export default async function DeployStaticPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const params = searchParams ? await searchParams : undefined
  const mode = typeof params?.mode === "string" ? params.mode : "ready"
  redirect(`/domains/new?deploy=static&setupPath=network-static&mode=${mode === "pending" ? "pending" : "ready"}`)

  return (
    <Suspense fallback={<div className="card stack">Loading deployment form...</div>}>
      <NewDomainForm />
    </Suspense>
  )
}
