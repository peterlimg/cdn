import React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import "./globals.css"

export const metadata: Metadata = {
  title: "CDN Demo",
  description: "Client-winning CDN control-plane and edge demo",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="brand">
              <span className="eyebrow">Control Plane Demo</span>
              <h1 className="title">Northstar CDN</h1>
              <p className="subtitle">
                A narrow demo focused on domain onboarding, cache policy publishing,
                request proof, analytics confirmation, and free-plan quota behavior.
              </p>
            </div>
            <nav className="nav">
              <Link href="/">Overview</Link>
              <Link href="/domains">Domains</Link>
              <Link href="/analytics">Analytics</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}
