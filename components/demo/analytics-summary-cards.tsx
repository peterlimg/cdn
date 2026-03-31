import React from "react"
import type { AnalyticsSummary } from "../../services/shared/src/types"

function formatBytes(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)} MB`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)} KB`
  }
  return `${value} B`
}

export function AnalyticsSummaryCards({ summary }: { summary: AnalyticsSummary }) {
  return (
    <div className="kpis">
      <div className="kpi">
        <span className="kpi-label">Total requests</span>
        <div className="kpi-value">{summary.totalRequests}</div>
      </div>
      <div className="kpi">
        <span className="kpi-label">Bandwidth</span>
        <div className="kpi-value">{formatBytes(summary.bandwidthBytes)}</div>
      </div>
      <div className="kpi">
        <span className="kpi-label">Hit ratio</span>
        <div className="kpi-value">{Math.round(summary.hitRatio * 100)}%</div>
      </div>
      <div className="kpi">
        <span className="kpi-label">Blocked</span>
        <div className="kpi-value">{summary.blockedRequests}</div>
      </div>
    </div>
  )
}
