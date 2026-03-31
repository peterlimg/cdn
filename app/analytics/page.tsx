import React from "react"
import { AnalyticsPageShell } from "../../components/demo/analytics-page-shell"
import { fetchDashboardSnapshot } from "../../lib/demo/service-client"

export default async function AnalyticsPage() {
  const snapshot = await fetchDashboardSnapshot()

  return (
    <div className="grid stack">
      <div>
        <span className="eyebrow">Derived confirmation</span>
        <h2>Analytics confirm what the edge already proved.</h2>
        <p className="muted">
          This screen is intentionally secondary to request proof. It exists to tie cache behavior,
          bandwidth savings, and free-plan quota consumption into one buyer-readable story after the
          Rust edge and Go API have already explained the request path.
        </p>
      </div>
      <AnalyticsPageShell summary={snapshot.analytics} />
    </div>
  )
}
