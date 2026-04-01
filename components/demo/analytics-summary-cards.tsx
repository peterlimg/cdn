import React from "react"
import { formatBytes } from "../../lib/demo/format"
import type { AnalyticsSummary } from "../../services/shared/src/types"

export function AnalyticsSummaryCards({ summary }: { summary: AnalyticsSummary }) {
  return (
    <div className="kpis builder-kpis">
      <div className="kpi builder-kpi">
        <span className="kpi-label">Total requests</span>
        <div className="kpi-value">{summary.totalRequests}</div>
      </div>
      <div className="kpi builder-kpi">
        <span className="kpi-label">Bandwidth</span>
        <div className="kpi-value">{formatBytes(summary.bandwidthBytes)}</div>
      </div>
      <div className="kpi builder-kpi">
        <span className="kpi-label">Hit ratio</span>
        <div className="kpi-value">{Math.round(summary.hitRatio * 100)}%</div>
      </div>
      <div className="kpi builder-kpi">
        <span className="kpi-label">Blocked</span>
        <div className="kpi-value">{summary.blockedRequests}</div>
      </div>
      <div className="kpi builder-kpi">
        <span className="kpi-label">Freshness</span>
        <div className="kpi-value">
          {summary.freshness === "live" ? "Live" : summary.freshness === "degraded" ? "Degraded" : "Updating"}
        </div>
      </div>
    </div>
  )
}
