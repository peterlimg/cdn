import React from "react"
import Link from "next/link"
import { DomainReadinessBadge } from "./domain-readiness-badge"
import { formatPercent } from "../../lib/demo/format"
import { displayHostname, displayUiCopy } from "../../lib/ui/display"
import type { DashboardSnapshot } from "../../services/shared/src/types"

export function DomainsShell({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { analytics, domains, quota } = snapshot
  const readyCount = domains.filter((domain) => domain.status === "ready").length
  const pendingCount = domains.length - readyCount
  const liveProofCount = domains.filter((domain) => domain.truthLabel === "live-proof").length
  const setupQueue = domains.filter((domain) => domain.status !== "ready").slice(0, 3)
  const proofReady = domains.filter((domain) => domain.status === "ready").slice(0, 3)

  return (
    <div className="grid stack">
      <section className="surface stack sites-index-shell builder-surface builder-grid">
        <div className="section-header overview-header">
          <div>
            <span className="eyebrow">Pull zones</span>
            <h2 className="section-title">All sites</h2>
            <p className="section-copy muted">
              Browse every hostname routed through the edge and open the zone that needs work.
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
            <div className="stats-strip stats-strip-dense section-meta">
              <div className="stat-tile">
                <span className="stat-label">Zones</span>
                <strong className="stat-value">{domains.length}</strong>
              </div>
              <div className="stat-tile">
                <span className="stat-label">Ready</span>
                <strong className="stat-value">{readyCount}</strong>
              </div>
              <div className="stat-tile">
                <span className="stat-label">Setup queue</span>
                <strong className="stat-value">{pendingCount}</strong>
              </div>
              <div className="stat-tile">
                <span className="stat-label">Live proof</span>
                <strong className="stat-value">{liveProofCount}</strong>
              </div>
              <div className="stat-tile">
                <span className="stat-label">Requests</span>
                <strong className="stat-value">{analytics.totalRequests}</strong>
              </div>
              <div className="stat-tile">
                <span className="stat-label">Quota used</span>
                <strong className="stat-value">{formatPercent(quota.percentUsed)}</strong>
              </div>
            </div>

            <div className="grid app-workspace sites-workspace">
              <div className="stack workspace-primary">
                <div className="overview-list-header">
                  <div>
                    <span className="eyebrow">Zone directory</span>
                    <h3 style={{ margin: "6px 0 0" }}>Every hostname on the edge</h3>
                  </div>
                  <p className="small muted inline-note">{domains.length} zones</p>
                </div>

                <div className="list zone-list">
                  {domains.map((domain) => (
                    <div className="zone-row zone-row-index" key={domain.id}>
                      <div className="zone-row-main">
                        <div>
                          <strong className="zone-row-title">{displayUiCopy(domain.projectName || displayHostname(domain.hostname))}</strong>
                          <div className="zone-row-meta">
                            <span>{displayHostname(domain.hostname)}</span>
                            <span className="zone-row-separator" aria-hidden="true" />
                            <span>Origin {domain.origin}</span>
                          </div>
                        </div>
                        <p className="small muted zone-row-note">{displayUiCopy(domain.readinessNote)}</p>
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
              </div>

              <aside className="stack workspace-secondary">
                <div className="surface surface-subtle stack support-panel builder-subpanel">
                  <div>
                    <span className="eyebrow">Setup queue</span>
                    <h3 className="support-title">Zones still in progress</h3>
                  </div>
                  {setupQueue.length > 0 ? (
                    <div className="mini-list">
                      {setupQueue.map((domain) => (
                        <div className="mini-block" key={domain.id}>
                          <strong>{displayUiCopy(domain.projectName || displayHostname(domain.hostname))}</strong>
                          <p className="small muted support-copy">{displayUiCopy(domain.readinessNote)}</p>
                          <Link className="button-ghost support-link" href={`/domains/${domain.id}`}>
                            Open setup
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="small muted support-copy">All current zones are ready for proof or already serving live requests.</p>
                  )}
                </div>

                <div className="surface surface-subtle stack support-panel builder-subpanel">
                  <div>
                    <span className="eyebrow">Proof queue</span>
                    <h3 className="support-title">Ready sites to validate</h3>
                  </div>
                  <div className="mini-list">
                    {proofReady.map((domain) => (
                      <div className="mini-row" key={domain.id}>
                        <span className="mini-label">{displayUiCopy(domain.projectName || displayHostname(domain.hostname))}</span>
                        <Link className="button-ghost support-link" href={`/domains/${domain.id}`}>
                          Proof
                        </Link>
                      </div>
                    ))}
                    <div className="mini-row">
                      <span className="mini-label">Analytics freshness</span>
                      <strong>{analytics.freshness}</strong>
                    </div>
                    <div className="mini-row">
                      <span className="mini-label">Bandwidth quota</span>
                      <strong>
                        {quota.usedBytes.toLocaleString()} / {quota.limitBytes.toLocaleString()} B
                      </strong>
                    </div>
                    <div className="metric-bar">
                      <span style={{ width: `${quota.percentUsed}%` }} />
                    </div>
                  </div>
                  <Link className="button-ghost" href="/analytics">
                    Review analytics
                  </Link>
                </div>
              </aside>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
