import React from "react"
export function PolicyRevisionBanner({
  activeRevisionId,
  appliedRevisionId,
}: {
  activeRevisionId: string
  appliedRevisionId: string
}) {
  const confirmed = activeRevisionId === appliedRevisionId

  return (
    <div className="surface revision-banner">
      <div className="revision-banner-label">Active revision</div>
      <div className="revision-banner-value">{activeRevisionId}</div>
      <div className="small muted">
        Edge apply status: {confirmed ? "confirmed on edge" : `publishing, last applied ${appliedRevisionId}`}
      </div>
    </div>
  )
}
