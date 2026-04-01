import React from "react"
import Link from "next/link"
import { DomainReadinessBadge } from "./domain-readiness-badge"
import { formatBytes, formatPercent } from "../../lib/demo/format"
import { sanitizeUiText } from "../../lib/ui/display"
import type { DashboardSnapshot } from "../../services/shared/src/types"

export function OverviewShell({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { analytics, domains, events, quota } = snapshot
  const readyCount = domains.filter((domain) => domain.status === "ready").length
  const pendingCount = domains.length - readyCount
  const liveProofCount = domains.filter((domain) => domain.truthLabel === "live-proof").length
  const recentDomains = domains.slice(0, 4)
  const nextDomain = domains.find((domain) => domain.status !== "ready") ?? domains[0] ?? null
  const latestProof = events[0] ?? null

  return (
    <div className="grid stack">
      <section className="surface stack overview-hero builder-surface builder-grid">
        <div className="section-header overview-header">
          <div>
            <span className="eyebrow">Overview</span>
            <h2 className="section-title">Resume work across your pull zones</h2>
            <p className="section-copy muted">
              Open the zone that still needs setup, send proof on a ready site, or create the next hostname routed through the edge.
            </p>
          </div>
          <Link className="button" href="/domains/new?mode=ready&setupPath=existing-origin">
            New zone
          </Link>
        </div>

        {domains.length === 0 ? (
          <div className="empty-state overview-empty-state">
            <div className="stack" style={{ gap: 8 }}>
              <h3 style={{ marginBottom: 0 }}>No pull zones yet</h3>
              <p className="muted small" style={{ margin: 0, maxWidth: 560 }}>
                Create your first pull zone to connect a hostname, attach an origin, and verify live traffic through the CDN.
              </p>
            </div>
            <Link className="button" href="/domains/new?mode=ready&setupPath=existing-origin">
              Create first zone
            </Link>
          </div>
        ) : (
          <>
            <div className="stats-strip stats-strip-dense overview-stats-strip">
              <div className="stat-tile">
                <span className="stat-label">Total zones</span>
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
              <div className="stat-tile">
                <span className="stat-label">Hit ratio</span>
                <strong className="stat-value">{Math.round(analytics.hitRatio * 100)}%</strong>
              </div>
              <div className="stat-tile">
                <span className="stat-label">Quota used</span>
                <strong className="stat-value">{formatPercent(quota.percentUsed)}</strong>
              </div>
            </div>

            <div className="grid app-workspace overview-workspace">
              <div className="stack workspace-primary">
                <div className="overview-list-header">
                  <div>
                    <span className="eyebrow">Recent zones</span>
                    <h3 style={{ margin: "6px 0 0" }}>Continue where you left off</h3>
                  </div>
                  <Link className="button-ghost" href="/domains">
                    View all sites
                  </Link>
                </div>

                <div className="list zone-list">
                  {recentDomains.map((domain) => (
                    <div className="zone-row zone-row-overview" key={domain.id}>
                      <div className="zone-row-main">
                        <div>
                          <strong className="zone-row-title">{sanitizeUiText(domain.projectName || domain.hostname)}</strong>
                          <div className="zone-row-meta">
                            <span>{sanitizeUiText(domain.hostname)}</span>
                            <span className="zone-row-separator" aria-hidden="true" />
                            <span>Origin {sanitizeUiText(domain.origin)}</span>
                          </div>
                        </div>
                        <p className="small muted zone-row-note">{sanitizeUiText(domain.readinessNote)}</p>
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
                    <span className="eyebrow">Next action</span>
                    <h3 className="support-title">Keep one zone moving</h3>
                  </div>
                  {nextDomain ? (
                    <>
                      <div>
                        <strong className="zone-row-title">{sanitizeUiText(nextDomain.projectName || nextDomain.hostname)}</strong>
                        <div className="zone-row-meta" style={{ marginTop: 6 }}>
                          <span>{sanitizeUiText(nextDomain.hostname)}</span>
                          <span className="zone-row-separator" aria-hidden="true" />
                          <span>{nextDomain.status === "ready" ? "Ready for proof" : "Needs setup"}</span>
                        </div>
                        <p className="small muted support-copy">{sanitizeUiText(nextDomain.readinessNote)}</p>
                      </div>
                      <div className="mini-list">
                        <div className="mini-row">
                          <span className="mini-label">Origin offload</span>
                          <strong>{formatBytes(analytics.cacheValueBytes)}</strong>
                        </div>
                        <div className="mini-row">
                          <span className="mini-label">Blocked requests</span>
                          <strong>{analytics.blockedRequests}</strong>
                        </div>
                        <div className="mini-row">
                          <span className="mini-label">Analytics freshness</span>
                          <strong>{analytics.freshness}</strong>
                        </div>
                      </div>
                      <Link className="button-secondary" href={`/domains/${nextDomain.id}`}>
                        Open active zone
                      </Link>
                    </>
                  ) : null}
                </div>

                <div className="surface surface-subtle stack support-panel builder-subpanel">
                  <div>
                    <span className="eyebrow">Latest proof</span>
                    <h3 className="support-title">Recent request outcome</h3>
                  </div>
                  {latestProof ? (
                    <>
                      <div className="proof-chip-row">
                        <span className="proof-chip">{latestProof.cacheStatus}</span>
                        <span className="proof-chip proof-chip-muted">{latestProof.finalDisposition}</span>
                      </div>
                      <div className="stack" style={{ gap: 6 }}>
                        <strong className="zone-row-title">{sanitizeUiText(latestProof.hostname)}</strong>
                        <p className="small muted support-copy">
                          {sanitizeUiText(latestProof.message)} Revision {latestProof.revisionId} served {latestProof.bytesServed.toLocaleString()} bytes.
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="small muted support-copy">Send a proof request from any ready zone to confirm edge behavior here.</p>
                  )}
                  <div className="mini-list">
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
                    Open analytics
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
