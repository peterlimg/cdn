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
  const truthCopy =
    truthLabel === "live-proof"
      ? "live proof"
      : truthLabel === "derived-with-lag"
        ? "derived with lag"
        : truthLabel === "seeded-demo-data"
          ? "seeded data"
          : "roadmap"

  return (
    <div className={`badge ${status === "ready" ? "ready" : "pending"}`}>
      <span>{copy}</span>
      <span className="small muted">{truthCopy}</span>
    </div>
  )
}
