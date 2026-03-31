import React from "react"
import { redirect } from "next/navigation"
import { DomainsShell } from "../../components/demo/domains-shell"
import { getSession } from "../../lib/auth/session"
import { fetchDashboardSnapshot } from "../../lib/demo/service-client"

export default async function DomainsPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const snapshot = await fetchDashboardSnapshot()

  return <DomainsShell domains={snapshot.domains} />
}
