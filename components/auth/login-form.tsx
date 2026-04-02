"use client"

import React from "react"
import { useActionState } from "react"
import { loginAction, type AuthActionState } from "../../app/auth/actions"

const initialState: AuthActionState = {}

export function LoginForm({ nextPath }: { nextPath?: string | null }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  return (
    <div className="auth-shell">
      <div className="surface stack auth-card">
        <div>
          <span className="eyebrow">Sign in</span>
          <h2 className="section-title">Open the CDN workspace</h2>
          <p className="section-copy muted">
            Sign in to create a pull zone, connect an origin, and verify live traffic through the edge.
          </p>
        </div>

        <form action={formAction} className="stack">
          {nextPath ? <input name="next" type="hidden" value={nextPath} /> : null}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input autoComplete="email" className="input" id="email" name="email" placeholder="you@example.com" type="email" />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input autoComplete="current-password" className="input" id="password" name="password" placeholder="At least 8 characters" type="password" />
          </div>

          {state.error ? <div className="alert">{state.error}</div> : null}

          <button className="button" disabled={isPending} type="submit">
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  )
}
