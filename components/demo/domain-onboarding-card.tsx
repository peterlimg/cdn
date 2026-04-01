import React from "react"
import { DomainReadinessBadge } from "./domain-readiness-badge"
import type { DomainRecord } from "../../services/shared/src/types"

export function DomainOnboardingCard({ domain }: { domain: DomainRecord }) {
  const setupHeading = domain.status === "ready" ? "This site can move into activation and proof" : "This site still has setup work before live traffic"
  const setupBody = domain.status === "ready"
    ? "Origin, DNS shape, and initial activation state are configured well enough to publish a revision and drive live request proof."
    : "The site record exists and setup sections are visible, but request proof remains blocked until readiness changes to ready."

  return (
    <div className="card stack">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span className="eyebrow">Site setup</span>
          <h2>{domain.hostname}</h2>
          <div className="small muted">{domain.projectName || "Unnamed site"}</div>
        </div>
        <DomainReadinessBadge status={domain.status} truthLabel={domain.truthLabel} />
      </div>

      <p className="muted">{domain.readinessNote}</p>

      <div className="list-item stack">
        <div>
          <span className="eyebrow">Setup contract</span>
          <h4>{setupHeading}</h4>
        </div>
        <div className="small muted">{setupBody}</div>
      </div>

      <div className="list-item stack">
        <div>
          <span className="eyebrow">Current setup</span>
          <h4>{domain.setupPath === "existing-origin" ? "Existing origin connected" : domain.setupPath === "network-static" ? "Network static deployment path" : "Demo static origin path"}</h4>
        </div>
        <div className="small muted">
          Origin status: {domain.originStatus || "pending"}. DNS status: {domain.dnsStatus || "pending"}. Setup stage: {domain.setupStage || "created"}.
        </div>
        {domain.lastOriginCheckAt ? (
          <div className="small muted">
            Last origin check: {domain.lastOriginCheckOutcome || domain.originStatus || "pending"} at {domain.lastOriginCheckAt}
          </div>
        ) : null}
        {domain.originValidationMessage ? <div className="small muted">{domain.originValidationMessage}</div> : null}
      </div>
    </div>
  )
}
