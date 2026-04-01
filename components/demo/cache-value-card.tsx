import React from "react"
export function CacheValueCard({ bytes }: { bytes: number }) {
  return (
    <div className="card stack builder-card">
      <div>
        <span className="eyebrow">Buyer value</span>
        <h3>Origin offload proved by cached bytes</h3>
      </div>
      <div className="kpi-value">{bytes.toLocaleString()} B</div>
      <p className="muted small">
        This is the amount of response payload served from edge cache instead of the origin for the
        tracked route. It exists to answer the client question: what changed for the origin after the
        policy was published?
      </p>
    </div>
  )
}
