import React from "react"
import Link from "next/link"
import { DomainReadinessBadge } from "./domain-readiness-badge"
import type { DomainRecord } from "../../services/shared/src/types"

export function DomainsShell({ domains }: { domains: DomainRecord[] }) {
  return (
    <div className="grid two-col">
      <section className="card stack">
        <div>
          <span className="eyebrow">Site setup</span>
          <h2>Create a site, connect an origin, and move into live edge proof.</h2>
          <p className="muted">
            Each site moves through setup in the detail workspace: origin, DNS or proxy instructions,
            publish state, request proof, and analytics confirmation.
          </p>
        </div>

        <div className="list">
          {domains.length === 0 ? (
            <div className="list-item">
              <h3>No sites yet</h3>
              <p className="muted small">
                Start with one site, choose how it gets an origin, and continue setup from the detail page.
              </p>
            </div>
          ) : (
            domains.map((domain) => (
              <div className="list-item stack" key={domain.id}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{domain.hostname}</strong>
                    <div className="small muted">{domain.projectName || "Unnamed site"}</div>
                    <div className="small muted">Origin: {domain.origin}</div>
                    <div className="small muted">Route: {domain.routeHint ?? "/assets/demo.css"}</div>
                  </div>
                  <DomainReadinessBadge status={domain.status} truthLabel={domain.truthLabel} />
                </div>
                <p className="small muted">{domain.readinessNote}</p>
                <div className="proof-grid small muted">
                  <span>Proxy mode: {domain.proxyMode ?? "proxied"}</span>
                  <span>Active revision: {domain.activeRevisionId}</span>
                </div>
                <div>
                  <Link className="button-secondary" href={`/domains/${domain.id}`}>
                    Open zone detail
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card stack">
        <span className="eyebrow">Quick start</span>
        <h3>Create the first site</h3>
        <p className="muted small">
          Start with an existing static origin. If you want the first proof path immediately, choose the ready setup state. If not, keep verification pending and finish setup first.
        </p>
        <div className="row">
          <Link className="button" href="/domains/new?mode=ready&setupPath=existing-origin">
            Connect existing origin
          </Link>
          <Link className="button-secondary" href="/domains/new?mode=pending&setupPath=demo-static">
            Use demo origin
          </Link>
        </div>
      </section>
    </div>
  )
}
