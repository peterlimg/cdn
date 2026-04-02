import React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { LogoutButton } from "../components/auth/logout-button"
import { loginPath } from "../lib/auth/navigation"
import { getSession } from "../lib/auth/session"
import "./globals.css"

export const metadata: Metadata = {
  title: "Unseen",
  description: "Unseen control plane and edge workspace",
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
                  <div className="brand-block">
                    <Link className="brand-link" href="/">
                      Unseen
                    </Link>
                    <span className="small muted">Pull zones control plane</span>
                  </div>
                  <span className="topbar-product-state">Live workspace</span>
                </div>
                  <div className="topbar-actions">
                    <nav className="nav nav-auth">
                      <Link href="/">Overview</Link>
                      <Link href="/domains">Sites</Link>
                      <Link href="/analytics">Analytics</Link>
                    </nav>
                    <div className="row topbar-session">
                      <span className="session-chip">Operator session</span>
                      <LogoutButton />
                    </div>
                  </div>
              </>
            ) : (
              <>
                <Link className="brand-link" href="/">
                  Unseen
                </Link>
                <div className="topbar-actions topbar-actions-marketing">
                  <Link className="button-ghost topbar-link" href={loginPath("/domains")}>
                    Product
                  </Link>
                  <div className="row topbar-session">
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
