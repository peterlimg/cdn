import React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { LogoutButton } from "../components/auth/logout-button"
import { getSession } from "../lib/auth/session"
import "./globals.css"

export const metadata: Metadata = {
  title: "CDN Demo",
  description: "Client-winning CDN control-plane and edge demo",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className={`topbar ${session ? "topbar-auth" : "topbar-marketing"}`}>
            {session ? (
              <>
                <div className="brand-inline">
                  <Link className="brand-link" href="/">
                    Northstar CDN
                  </Link>
                  <span className="small muted">Pull zones</span>
                </div>
                <div className="topbar-actions">
                  <nav className="nav nav-auth">
                    <Link href="/">Overview</Link>
                    <Link href="/domains">Sites</Link>
                    <Link href="/analytics">Analytics</Link>
                  </nav>
                  <div className="row topbar-session">
                    <span className="session-chip">{session.email}</span>
                    <LogoutButton />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="brand">
                  <span className="eyebrow">Northstar CDN</span>
                  <h1 className="title">Northstar CDN</h1>
                  <p className="subtitle">
                    Configure a site, connect an origin, publish CDN behavior, and verify real traffic
                    through the edge.
                  </p>
                </div>
                <div className="stack" style={{ alignItems: "flex-end", gap: 10 }}>
                  <nav className="nav">
                    <Link href="/">Overview</Link>
                    <Link href="/domains">Sites</Link>
                    <Link href="/analytics">Analytics</Link>
                  </nav>
                  <div className="row" style={{ alignItems: "center", justifyContent: "flex-end" }}>
                    <Link className="button-secondary" href="/login">
                      Sign in
                    </Link>
                  </div>
                </div>
              </>
            )}
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}
