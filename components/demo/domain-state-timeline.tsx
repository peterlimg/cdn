import React from "react"
import type { DomainStatus } from "../../services/shared/src/types"

const states: Array<{ id: DomainStatus | "blocked"; label: string; description: string }> = [
  {
    id: "pending",
    label: "Pending setup",
    description: "DNS and verification are visible, but live traffic stays blocked.",
  },
  {
    id: "ready",
    label: "Ready for live proof",
    description: "Rust edge is allowed to serve the demo route for this domain.",
  },
  {
    id: "blocked",
    label: "Blocked by plan state",
    description: "Quota or readiness rules stop the request even if the domain is configured.",
  },
]

export function DomainStateTimeline({ status }: { status: DomainStatus }) {
  return (
    <div className="card stack">
      <div>
        <span className="eyebrow">State model</span>
        <h3>What each domain state means</h3>
      </div>
      <div className="list">
        {states.map((item) => (
          <div className="list-item" key={item.id}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <strong>{item.label}</strong>
              {item.id === status ? <div className="badge ready">current</div> : null}
            </div>
            <div className="small muted" style={{ marginTop: 8 }}>{item.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
