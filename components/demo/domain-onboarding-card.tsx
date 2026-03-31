import React from "react"
import { DomainReadinessBadge } from "./domain-readiness-badge"
import type { DomainRecord } from "../../services/shared/src/types"

export function DomainOnboardingCard({ domain }: { domain: DomainRecord }) {
  return (
    <div className="card stack">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span className="eyebrow">Onboarding</span>
          <h2>{domain.hostname}</h2>
        </div>
        <DomainReadinessBadge status={domain.status} truthLabel={domain.truthLabel} />
      </div>

      <p className="muted">{domain.readinessNote}</p>

      <div className="list-item stack">
        <div>
          <span className="eyebrow">Readiness contract</span>
          <h4>{domain.status === "ready" ? "Ready domains can enter the live proof path" : "Pending domains stay blocked by design"}</h4>
        </div>
        <div className="small muted">
          {domain.status === "ready"
            ? "This domain record is ready to route through Nginx into the Rust edge, so it can produce live proof, service logs, and analytics confirmation."
            : "This domain record shows the same control-plane shape as a live zone, but Rust intentionally blocks traffic until readiness changes to ready."}
        </div>
      </div>

      <div className="list-item stack">
        <div>
          <span className="eyebrow">Presenter guidance</span>
          <h4>What to say here</h4>
        </div>
        <div className="small muted">
          {domain.status === "ready"
            ? "Call out that the buyer is looking at a real control-plane record whose readiness mode allows immediate edge proof in the demo."
            : "Call out that onboarding shape is real, but the product is honestly showing a non-live state instead of pretending verification already happened."}
        </div>
      </div>
    </div>
  )
}
