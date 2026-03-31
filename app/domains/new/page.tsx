import React from "react"
import { redirect } from "next/navigation"
import { createDomain } from "../../../lib/demo/service-client"

export default async function NewDomainPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const resolved = await searchParams
  const mode = resolved.mode === "pending" ? "pending" : "ready"
  const hostname = mode === "ready" ? "ready-demo.northstarcdn.test" : "pending-demo.northstarcdn.test"
  const domain = await createDomain({ hostname, mode })

  redirect(`/domains/${domain.id}`)
}
