import React from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ZoneDetailShell } from "../../../components/demo/zone-detail-shell"
import { fetchDashboardSnapshot, fetchDomain, fetchLogs } from "../../../lib/demo/service-client"

export default async function DomainDetailPage({
  params,
}: {
  params: Promise<{ domainId: string }>
}) {
  const { domainId } = await params
  const domainRecord = await fetchDomain(domainId)

  if (!domainRecord) {
    notFound()
  }

  const domain = domainRecord as NonNullable<typeof domainRecord>
  const [snapshot, edgeLogs, apiLogs] = await Promise.all([
    fetchDashboardSnapshot(domain.id),
    fetchLogs(domain.id, "edge"),
    fetchLogs(domain.id, "api"),
  ])

  return (
    <div className="grid stack">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span className="eyebrow">Zone detail</span>
          <h2 style={{ marginBottom: 0 }}>{domain.hostname}</h2>
        </div>
        <Link className="button-ghost" href="/domains">
          Back to domains
        </Link>
      </div>

      <ZoneDetailShell
        domain={domain}
        events={snapshot.events}
        summary={snapshot.analytics}
        edgeLogs={edgeLogs}
        apiLogs={apiLogs}
      />
    </div>
  )
}
