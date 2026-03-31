import React from "react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="grid">
      <section className="hero">
        <div className="hero-panel">
          <span className="eyebrow">Buyer story</span>
          <h2>Show one real config change causing one real edge outcome.</h2>
          <p className="subtitle">
            This demo is intentionally narrow: add a domain, publish a cache policy,
            send repeated traffic, prove MISS to HIT at the edge, and show the same
            behavior reflected in analytics and quota state.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/domains">
              Start domain walkthrough
            </Link>
            <Link className="button-secondary" href="/analytics">
              Inspect analytics story
            </Link>
          </div>
        </div>
        <div className="card">
          <span className="eyebrow">Proof contract</span>
          <div className="stack">
            <div>
              <h3>Live proof</h3>
              <p className="muted small">
                Cache rule publish, active revision confirmation, request ID, and
                cache result are generated from the edge evaluation path.
              </p>
            </div>
            <div>
              <h3>Derived confirmation</h3>
              <p className="muted small">
                Analytics totals, cache value, and quota state are derived from
                request events, not hand-edited dashboard values.
              </p>
            </div>
            <div>
              <h3>Roadmap boundaries</h3>
              <p className="muted small">
                No claim of full DNS hosting, global anycast, enterprise WAF, or
                production billing maturity in this first-pass demo.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="kpis">
        <div className="kpi">
          <span className="kpi-label">Primary control</span>
          <div className="kpi-value">Cache policy</div>
        </div>
        <div className="kpi">
          <span className="kpi-label">Primary proof</span>
          <div className="kpi-value">MISS to HIT</div>
        </div>
        <div className="kpi">
          <span className="kpi-label">Quota rule</span>
          <div className="kpi-value">Healthy to Reached</div>
        </div>
        <div className="kpi">
          <span className="kpi-label">Scope boundary</span>
          <div className="kpi-value">1 tenant / 1 route</div>
        </div>
      </section>
    </div>
  )
}
