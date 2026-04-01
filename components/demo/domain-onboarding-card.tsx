import React from "react"
import { DomainReadinessBadge } from "./domain-readiness-badge"
import { displayHostname, displayUiCopy } from "../../lib/ui/display"
import type { DomainRecord } from "../../services/shared/src/types"

export function DomainOnboardingCard({ domain }: { domain: DomainRecord }) {
	const setupHeading = domain.status === "ready" ? "Zone is ready for traffic tests" : "Finish setup before traffic can flow"
	const setupBody = domain.status === "ready"
		? "Origin and verification checks have passed, so you can test requests through the edge now."
		: "Review the origin settings below, fix any failed checks, then verify DNS before sending traffic through the edge."

  return (
    <div className="card stack builder-card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span className="eyebrow">Site setup</span>
          <h2>{displayHostname(domain.hostname)}</h2>
          <div className="small muted">{displayUiCopy(domain.projectName || "Unnamed site")}</div>
        </div>
        <DomainReadinessBadge status={domain.status} truthLabel={domain.truthLabel} />
      </div>

      <p className="muted">{displayUiCopy(domain.readinessNote)}</p>

		<div className="list-item stack">
			<div>
				<span className="eyebrow">Current status</span>
				<h4>{setupHeading}</h4>
			</div>
			<div className="small muted">{setupBody}</div>
		</div>

		<div className="list-item stack">
			<div>
				<span className="eyebrow">Zone summary</span>
				<h4>{domain.setupPath === "existing-origin" ? "Existing origin connected" : domain.setupPath === "network-static" ? "Network static deployment path" : "Managed static origin path"}</h4>
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
