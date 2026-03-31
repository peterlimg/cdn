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
            ? "This domain is configured to route through the Rust edge and can produce live request proof."
            : "This domain shows onboarding shape only. DNS and origin are visible, but live traffic remains blocked until the state changes to ready."}
        </div>
      </div>
    </div>
  )
}
