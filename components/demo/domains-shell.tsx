import React from "react"
import Link from "next/link"
import { DomainReadinessBadge } from "./domain-readiness-badge"
import type { DomainRecord } from "../../services/shared/src/types"

export function DomainsShell({ domains }: { domains: DomainRecord[] }) {
  return (
    <div className="grid stack">
      <section className="card stack">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "end" }}>
          <div>
            <span className="eyebrow">Pull zones</span>
            <h2 style={{ marginBottom: 8 }}>Connect a site and let the edge pull from your origin.</h2>
            <p className="muted" style={{ maxWidth: 640 }}>
              Start with the hostname and origin URL. You can adjust DNS, caching, and verification details after the zone is created.
            </p>
          </div>
          <Link className="button" href="/domains/new?mode=ready&setupPath=existing-origin">
            Add pull zone
          </Link>
        </div>
      </section>

      <section className="card stack">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="eyebrow">Zones</span>
            <h3 style={{ marginBottom: 4 }}>Your connected sites</h3>
          </div>
          <div className="small muted">{domains.length} total</div>
        </div>

        <div className="list">
          {domains.length === 0 ? (
            <div className="list-item stack">
              <h3>No pull zones yet</h3>
              <p className="muted small">
                Create one pull zone to connect a hostname to an origin and start testing traffic through the CDN.
              </p>
              <div>
                <Link className="button" href="/domains/new?mode=ready&setupPath=existing-origin">
                  Add first pull zone
                </Link>
              </div>
            </div>
          ) : (
            domains.map((domain) => (
              <div className="list-item stack" key={domain.id}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{domain.projectName || domain.hostname}</strong>
                    <div className="small muted">{domain.hostname}</div>
                    <div className="small muted">Origin: {domain.origin}</div>
                  </div>
                  <DomainReadinessBadge status={domain.status} truthLabel={domain.truthLabel} />
                </div>
                <p className="small muted">{domain.readinessNote}</p>
                <div>
                  <Link className="button-secondary" href={`/domains/${domain.id}`}>
                    Open zone
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
