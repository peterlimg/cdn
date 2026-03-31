import React from "react"
import type { DomainStatus, TruthLabel } from "../../services/shared/src/types"

export function DomainReadinessBadge({
  status,
  truthLabel,
}: {
  status: DomainStatus
  truthLabel: TruthLabel
}) {
  const copy = status === "ready" ? "Ready to activate" : "Setup in progress"

  return (
    <div className={`badge ${status === "ready" ? "ready" : "pending"}`}>
      <span>{copy}</span>
      <span className="small muted">{truthLabel}</span>
    </div>
  )
}
