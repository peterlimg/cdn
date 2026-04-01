import React from "react"
import { redirect } from "next/navigation"
import { AnalyticsPageShell } from "../../components/demo/analytics-page-shell"
import { getSession } from "../../lib/auth/session"
import { fetchDashboardSnapshot } from "../../lib/demo/service-client"

export default async function AnalyticsPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const snapshot = await fetchDashboardSnapshot()

  return (
    <div className="grid stack">
      <section className="surface stack">
        <div className="section-header">
          <div>
            <span className="eyebrow">Analytics</span>
            <h2 className="section-title">Traffic and cache confirmation</h2>
            <p className="section-copy muted">
              Use analytics after request proof to confirm cache behavior, bandwidth savings, and quota usage.
            </p>
          </div>
        </div>
        <p className="muted small inline-note">
          `Updating` means ClickHouse is catching up. `Degraded` means the dashboard is temporarily using local event summaries instead.
        </p>
      </section>
      <AnalyticsPageShell summary={snapshot.analytics} />
    </div>
  )
}
