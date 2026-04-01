import React from "react"
import Link from "next/link"
import { loginPath } from "../lib/auth/navigation"
import { getSession } from "../lib/auth/session"
import { fetchDashboardSnapshot } from "../lib/demo/service-client"
import { OverviewShell } from "../components/demo/overview-shell"

export default async function HomePage() {
  const session = await getSession()

  if (session) {
    const snapshot = await fetchDashboardSnapshot()
    return <OverviewShell snapshot={snapshot} />
  }

  return (
    <div className="grid marketing-home">
      <section className="hero hero-marketing">
        <div className="hero-panel hero-panel-marketing">
          <div className="hero-copy stack">
            <span className="eyebrow">Northstar CDN</span>
            <div className="hero-pill">Pull zones for fast global delivery</div>
            <h2>Launch pull zones fast.</h2>
            <p className="subtitle">
              Create a pull zone, point it at your origin, and confirm that repeated browser requests are served from the CDN instead of the origin.
            </p>
            <div className="hero-actions hero-actions-left">
              <Link className="button" href="/login">
                Sign in to start
              </Link>
              <Link className="button-secondary" href={loginPath("/domains/new")}>
                Create first site
              </Link>
            </div>

            <div className="marketing-inline-facts">
              <div className="marketing-inline-fact">
                <span className="mini-label">Policy</span>
                <strong>Revision published at edge</strong>
              </div>
              <div className="marketing-inline-fact">
                <span className="mini-label">Logs</span>
                <strong>Edge and API trail stay aligned</strong>
              </div>
            </div>
          </div>

          <div className="hero-console">
            <div className="console-toolbar">
              <div className="console-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <span className="console-title">proof-loop.ts</span>
              <span className="console-status">ready-site.northstarcdn.test</span>
            </div>

            <div className="console-body">
              <div className="console-line">
                <span className="console-line-number">01</span>
                <code>zone = pullZones.create("ready-site")</code>
              </div>
              <div className="console-line">
                <span className="console-line-number">02</span>
                <code>zone.origin = "https://static.example.com"</code>
              </div>
              <div className="console-line">
                <span className="console-line-number">03</span>
                <code>publish("rev-12")</code>
              </div>
              <div className="console-line console-line-output">
                <span className="console-line-number">04</span>
                <code>curl -I /  x-cache: MISS</code>
              </div>
              <div className="console-line console-line-output">
                <span className="console-line-number">05</span>
                <code>curl -I /  x-cache: HIT</code>
              </div>
              <div className="console-line console-line-output">
                <span className="console-line-number">06</span>
                <code>analytics.cacheValue += 18_432</code>
              </div>
            </div>

            <div className="console-summary stack">
              <div>
                <span className="eyebrow">Live proof flow</span>
                <h3 className="support-title">Run the proof loop</h3>
              </div>
              <div className="proof-chip-row">
                <span className="proof-chip proof-chip-square">MISS</span>
                <span className="proof-chip proof-chip-square">HIT</span>
                <span className="proof-chip proof-chip-muted proof-chip-square">logs explain</span>
              </div>
              <p className="small muted support-copy">
                Request two is the proof moment: same hostname, same path, cache hit, and matching analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-strip stats-strip-dense marketing-stats">
        <div className="stat-tile">
          <span className="stat-label">01 Start</span>
          <strong className="stat-value">Operator sign-in</strong>
        </div>
        <div className="stat-tile">
          <span className="stat-label">02 Setup</span>
          <strong className="stat-value">Hostname + origin</strong>
        </div>
        <div className="stat-tile">
          <span className="stat-label">03 Publish</span>
          <strong className="stat-value">Revision at edge</strong>
        </div>
        <div className="stat-tile">
          <span className="stat-label">04 Proof</span>
          <strong className="stat-value">MISS to HIT</strong>
        </div>
        <div className="stat-tile">
          <span className="stat-label">05 Logs</span>
          <strong className="stat-value">Edge + API trail</strong>
        </div>
        <div className="stat-tile">
          <span className="stat-label">06 Analytics</span>
          <strong className="stat-value">Cache value confirmed</strong>
        </div>
      </section>
    </div>
  )
}
