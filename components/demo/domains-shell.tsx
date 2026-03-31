import React from "react"
import Link from "next/link"
import { DomainReadinessBadge } from "./domain-readiness-badge"
import type { DomainRecord } from "../../services/shared/src/types"

export function DomainsShell({ domains }: { domains: DomainRecord[] }) {
  return (
    <div className="grid two-col">
      <section className="card stack">
        <div>
          <span className="eyebrow">Demo narrative</span>
          <h2>Walk through onboarding, then switch to live proof.</h2>
          <p className="muted">
            Create a demo tenant zone, decide whether it is still pending or pre-verified, and then
            move into the domain detail view to publish the cache policy and drive edge traffic.
          </p>
        </div>

        <div className="list">
          {domains.length === 0 ? (
            <div className="list-item">
              <h3>No domains yet</h3>
              <p className="muted small">
                Use the domain detail page shortcut below to create either a pre-verified ready
                domain or a narrated pending-setup fallback state.
              </p>
            </div>
          ) : (
            domains.map((domain) => (
              <div className="list-item stack" key={domain.id}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{domain.hostname}</strong>
                    <div className="small muted">{domain.origin}</div>
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
        <h3>Create the first demo zone</h3>
        <p className="muted small">
          The client-facing story uses a ready domain for live traffic proof. A pending domain shows
          the exact same config sections, but the Rust edge will block traffic until the state is ready.
        </p>
        <div className="row">
          <Link className="button" href="/domains/new?mode=ready">
            New ready domain
          </Link>
          <Link className="button-secondary" href="/domains/new?mode=pending">
            New pending domain
          </Link>
        </div>
      </section>
    </div>
  )
}
