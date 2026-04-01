import React from "react"
import Link from "next/link"
import { DomainReadinessBadge } from "./domain-readiness-badge"
import type { DomainRecord } from "../../services/shared/src/types"

export function DomainsShell({ domains }: { domains: DomainRecord[] }) {
  const readyCount = domains.filter((domain) => domain.status === "ready").length
  const pendingCount = domains.length - readyCount
  const liveProofCount = domains.filter((domain) => domain.truthLabel === "live-proof").length

  return (
    <div className="grid stack">
      <section className="surface stack">
        <div className="section-header">
          <div>
            <span className="eyebrow">Pull zones</span>
            <h2 className="section-title">Your sites</h2>
            <p className="section-copy muted">
              Manage the hostnames routed through the edge and continue any zone that still needs setup or proof.
            </p>
          </div>
          <Link className="button" href="/domains/new?mode=ready&setupPath=existing-origin">
            New zone
          </Link>
        </div>

        {domains.length === 0 ? (
          <div className="empty-state">
            <div className="stack" style={{ gap: 6 }}>
              <h3 style={{ marginBottom: 0 }}>No pull zones yet</h3>
              <p className="muted small" style={{ margin: 0, maxWidth: 560 }}>
                Add your first hostname and origin to start routing traffic through the CDN.
              </p>
            </div>
            <Link className="button" href="/domains/new?mode=ready&setupPath=existing-origin">
              Create pull zone
            </Link>
          </div>
        ) : (
          <>
            <div className="stats-strip">
              <div className="stat-tile">
                <span className="stat-label">Total</span>
                <strong className="stat-value">{domains.length}</strong>
              </div>
              <div className="stat-tile">
                <span className="stat-label">Ready</span>
                <strong className="stat-value">{readyCount}</strong>
              </div>
              <div className="stat-tile">
                <span className="stat-label">Needs setup</span>
                <strong className="stat-value">{pendingCount}</strong>
              </div>
              <div className="stat-tile">
                <span className="stat-label">Live proof</span>
                <strong className="stat-value">{liveProofCount}</strong>
              </div>
            </div>

            <div className="list zone-list">
              {domains.map((domain) => (
                <div className="zone-row" key={domain.id}>
                  <div className="zone-row-main">
                    <div>
                      <strong className="zone-row-title">{domain.projectName || domain.hostname}</strong>
                      <div className="zone-row-meta">
                        <span>{domain.hostname}</span>
                        <span className="zone-row-separator" aria-hidden="true" />
                        <span>Origin {domain.origin}</span>
                      </div>
                    </div>
                    <p className="small muted zone-row-note">{domain.readinessNote}</p>
                  </div>
                  <div className="zone-row-actions">
                    <DomainReadinessBadge status={domain.status} truthLabel={domain.truthLabel} />
                    <Link className="button-secondary" href={`/domains/${domain.id}`}>
                      Open zone
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
