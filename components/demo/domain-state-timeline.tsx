import React from "react"
import type { DomainStatus } from "../../services/shared/src/types"

const states: Array<{ id: DomainStatus | "blocked"; label: string; description: string }> = [
  {
    id: "pending",
    label: "Setup in progress",
    description: "The site record exists, but verification or activation work is still incomplete.",
  },
  {
    id: "ready",
    label: "Ready to activate",
    description: "The edge can serve the configured route and produce live request proof for this site.",
  },
  {
    id: "blocked",
    label: "Blocked on request path",
    description: "Quota or readiness rules can still stop requests even after setup is visible in the UI.",
  },
]

export function DomainStateTimeline({ status }: { status: DomainStatus }) {
  return (
    <div className="card stack">
      <div>
        <span className="eyebrow">Setup state</span>
        <h3>What each site state means</h3>
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
