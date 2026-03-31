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
    <div className="note">
      <strong>Active revision:</strong> {activeRevisionId}
      <div className="small muted">
        Edge apply status: {confirmed ? "confirmed on edge" : `publishing, last applied ${appliedRevisionId}`}
      </div>
    </div>
  )
}
