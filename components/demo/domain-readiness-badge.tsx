import React from "react"
import type { DomainStatus, TruthLabel } from "../../services/shared/src/types"

export function DomainReadinessBadge({
  status,
  truthLabel,
}: {
  status: DomainStatus
  truthLabel: TruthLabel
}) {
  return (
    <div className={`badge ${status === "ready" ? "ready" : "pending"}`}>
      <span>{status === "ready" ? "Ready for live proof" : "Pending setup"}</span>
      <span className="small muted">{truthLabel}</span>
    </div>
  )
}
