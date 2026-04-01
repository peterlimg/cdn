import React from "react"
import Link from "next/link"
import { getSession } from "../lib/auth/session"
import { fetchDomains } from "../lib/demo/service-client"
import { DomainsShell } from "../components/demo/domains-shell"

export default async function HomePage() {
  const session = await getSession()
  const domains = session ? await fetchDomains() : []

  if (session) {
    return <DomainsShell domains={domains} />
  }

  return (
    <div className="grid">
      <section className="hero">
        <div className="hero-panel">
          <span className="eyebrow">Northstar CDN</span>
          <div className="hero-pill">Pull zones for fast global delivery</div>
          <h2>Launch pull zones fast.</h2>
          <p className="subtitle">
            Create a pull zone, point it at your origin, and confirm that repeated browser requests are served from the CDN instead of the origin.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/login">
              Sign in to start
            </Link>
            <Link className="button-secondary" href="/domains/new">
              Create first site
            </Link>
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
