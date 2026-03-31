"use client"

import React, { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"

const defaultHostnames = {
  ready: "ready-demo.northstarcdn.test",
  pending: "pending-demo.northstarcdn.test",
} as const

export function NewDomainForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMode = searchParams.get("mode") === "pending" ? "pending" : "ready"

  const [mode, setMode] = useState<"ready" | "pending">(initialMode)
  const [hostname, setHostname] = useState<string>(defaultHostnames[initialMode])
  const [hostnameDirty, setHostnameDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function createZone() {
    setError(null)
    const response = await fetch("/api/reseed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hostname, mode }),
    })

    const payload = await response.json().catch(() => ({ error: "failed to create zone" }))
    if (!response.ok) {
      setError(payload.error ?? "failed to create zone")
      return
    }

    router.push(`/domains/${payload.id}`)
    router.refresh()
  }

  return (
    <div className="grid stack">
      <div className="card stack">
        <div>
          <span className="eyebrow">Zone onboarding</span>
          <h2>Create a buyer-readable demo zone</h2>
          <p className="muted">
            This step creates the control-plane record first, then takes you to the zone detail page
            where DNS shape, origin settings, policy changes, proof, logs, and analytics all stay visible.
          </p>
        </div>

        <div className="field">
          <label htmlFor="hostname">Hostname</label>
          <input
            className="input"
            id="hostname"
            onChange={(event) => {
              setHostname(event.target.value)
              setHostnameDirty(true)
            }}
            placeholder="ready-demo.northstarcdn.test"
            value={hostname}
          />
        </div>

        <div className="field">
          <label htmlFor="mode">Readiness mode</label>
          <select
            className="select"
            id="mode"
            onChange={(event) => {
              const nextMode = event.target.value === "pending" ? "pending" : "ready"
              setMode(nextMode)
              if (!hostnameDirty || hostname === defaultHostnames.ready || hostname === defaultHostnames.pending) {
                setHostname(defaultHostnames[nextMode])
                setHostnameDirty(false)
              }
            }}
            value={mode}
          >
            <option value="ready">Ready: allow live proof for this zone</option>
            <option value="pending">Pending: onboarding shape only</option>
          </select>
        </div>

        <div className="note">
          <strong>{mode === "ready" ? "Ready mode" : "Pending mode"}:</strong>{" "}
          {mode === "ready"
            ? "Use this for the main walkthrough when you want this zone to enter the live edge proof path immediately."
            : "Use this when you want to narrate onboarding state honestly without claiming that live traffic is enabled yet."}
        </div>

        {error ? <div className="alert">{error}</div> : null}

        <div className="row">
          <button
            className="button"
            disabled={isPending || hostname.trim() === ""}
            onClick={() => startTransition(async () => {
              await createZone()
            })}
            type="button"
          >
            {isPending ? "Creating zone..." : "Create zone and open detail"}
          </button>
          <button className="button-secondary" onClick={() => router.push("/domains")} type="button">
            Back to domains
          </button>
        </div>
      </div>
    </div>
  )
}
