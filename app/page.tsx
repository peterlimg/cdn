import React from "react"
import Link from "next/link"
import { getSession } from "../lib/auth/session"

export default async function HomePage() {
  const session = await getSession()

  return (
    <div className="grid">
      <section className="hero">
        <div className="hero-panel">
          <span className="eyebrow">Real user setup</span>
          <h2>Sign in, connect a site, publish CDN config, and prove traffic is flowing through the edge.</h2>
          <p className="subtitle">
            The first slice focuses on a believable setup journey: create a site, connect or deploy a
            simple static origin, publish a baseline CDN rule, and confirm the result with request proof,
            logs, and analytics.
          </p>
          <div className="hero-actions">
            <Link className="button" href={session ? "/domains" : "/login"}>
              {session ? "Continue setup" : "Sign in to start"}
            </Link>
            <Link className="button-secondary" href="/domains/new">
              Create first site
            </Link>
          </div>
        </div>
        <div className="card">
          <span className="eyebrow">Setup contract</span>
          <div className="stack">
            <div>
              <h3>Real setup states</h3>
              <p className="muted small">
                The product must tell the user whether the site is configured, still verifying,
                applying at edge, or already active.
              </p>
            </div>
            <div>
              <h3>First live proof</h3>
              <p className="muted small">
                Request proof and service logs are the immediate source of truth that setup worked.
              </p>
            </div>
            <div>
              <h3>Analytics confirmation</h3>
              <p className="muted small">
                Analytics confirm the request path after the proof already succeeded.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="kpis">
        <div className="kpi">
          <span className="kpi-label">Start</span>
          <div className="kpi-value">Sign in</div>
        </div>
        <div className="kpi">
          <span className="kpi-label">Setup</span>
          <div className="kpi-value">Domain + origin</div>
        </div>
        <div className="kpi">
          <span className="kpi-label">Activation</span>
          <div className="kpi-value">Publish at edge</div>
        </div>
        <div className="kpi">
          <span className="kpi-label">Proof</span>
          <div className="kpi-value">Live request</div>
        </div>
      </section>
    </div>
  )
}
