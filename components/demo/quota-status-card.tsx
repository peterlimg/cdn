import React from "react"
export function QuotaStatusCard({
  usedBytes,
  limitBytes,
  reached,
}: {
  usedBytes: number
  limitBytes: number
  reached: boolean
}) {
  const percent = Math.min((usedBytes / limitBytes) * 100, 100)
  const percentLabel = `${Math.round(percent * 10) / 10}%`

  return (
    <div className="card stack builder-card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span className="eyebrow">Free plan usage</span>
          <h3>Bandwidth quota</h3>
        </div>
        <div className={`badge ${reached ? "reached" : "ready"}`}>{reached ? "Reached" : percentLabel}</div>
      </div>
      <div className="metric-bar">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="small muted">
        {usedBytes.toLocaleString()} / {limitBytes.toLocaleString()} bytes consumed on the free plan.
      </div>
    </div>
  )
}
