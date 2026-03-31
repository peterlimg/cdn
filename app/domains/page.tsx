import React from "react"
import { DomainsShell } from "../../components/demo/domains-shell"
import { fetchDashboardSnapshot } from "../../lib/demo/service-client"

export default async function DomainsPage() {
  const snapshot = await fetchDashboardSnapshot()

  return <DomainsShell domains={snapshot.domains} />
}
