"use client"

import React, { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { SetupPath } from "../../services/shared/src/types"

const defaultHostnames = {
  ready: "ready-demo.northstarcdn.test",
  pending: "pending-demo.northstarcdn.test",
} as const

const defaultProjectNames: Record<SetupPath, string> = {
  "existing-origin": "My static site",
  "network-static": "Network static site",
  "demo-static": "Demo static site",
}

const defaultOrigins: Record<SetupPath, string> = {
  "existing-origin": "https://static.example.com",
  "network-static": "http://ready-origin:80",
  "demo-static": "http://127.0.0.1:3000/origin",
}

export function NewDomainForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMode = searchParams.get("mode") === "pending" ? "pending" : "ready"
  const initialSetupPath = (searchParams.get("setupPath") as SetupPath | null) ?? (searchParams.get("deploy") === "static" ? "network-static" : "existing-origin")

  const [mode, setMode] = useState<"ready" | "pending">(initialMode)
  const [projectName, setProjectName] = useState(defaultProjectNames[initialSetupPath])
  const [setupPath, setSetupPath] = useState<SetupPath>(initialSetupPath)
  const [hostname, setHostname] = useState<string>(defaultHostnames[initialMode])
  const [origin, setOrigin] = useState<string>(defaultOrigins[initialSetupPath])
  const [hostnameDirty, setHostnameDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isNetworkStatic = setupPath === "network-static"

  async function createZone() {
    setError(null)
    const response = await fetch("/api/reseed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hostname, mode, projectName, origin, setupPath }),
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
          <span className="eyebrow">Site setup</span>
          <h2>{isNetworkStatic ? "Deploy a static site onto the network" : "Create your first CDN-backed site"}</h2>
          <p className="muted">
            {isNetworkStatic
              ? "Provision a network static site first, then attach that deployed origin to the CDN workflow so the site can be browsed through the edge."
              : "Start with a hostname, choose how this site gets its origin, and continue into the setup workspace where DNS, activation, proof, logs, and analytics stay visible."}
          </p>
        </div>

        <div className="field">
          <label htmlFor="projectName">Project name</label>
          <input
            className="input"
            id="projectName"
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="Marketing site"
            value={projectName}
          />
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
          <label htmlFor="setupPath">Origin path</label>
          <select
            className="select"
            id="setupPath"
            onChange={(event) => {
              const nextPath = (event.target.value as SetupPath)
              setSetupPath(nextPath)
              setOrigin(defaultOrigins[nextPath])
            }}
            value={setupPath}
          >
            <option value="existing-origin">Connect an existing static origin</option>
            <option value="network-static">Deploy a static site on the network</option>
            <option value="demo-static">Use a demo static origin</option>
          </select>
        </div>

        {isNetworkStatic ? (
          <div className="note stack" style={{ gap: 8 }}>
            <div>
              <strong>Separate deploy flow:</strong> this path creates a deployed static site first and uses that deployed origin as the CDN origin.
            </div>
            <div className="small muted">
              Default deployed origin: <code>{origin}</code>. Change it if you want this CDN site to attach to a different network static deployment.
            </div>
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="origin">Origin URL</label>
          <input
            className="input"
            id="origin"
            onChange={(event) => setOrigin(event.target.value)}
            placeholder="https://static.example.com"
            value={origin}
          />
        </div>

        <div className="field">
          <label htmlFor="mode">Initial verification state</label>
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
            <option value="ready">Ready now: allow immediate live proof</option>
            <option value="pending">Verification pending: setup visible, traffic blocked</option>
          </select>
        </div>

        <div className="note">
          <strong>{mode === "ready" ? "Ready now" : "Verification pending"}:</strong>{" "}
          {mode === "ready"
            ? isNetworkStatic
              ? "This deployment path is ready to browse through the CDN immediately after the site record is created."
              : "This setup path is allowed to move directly into publish and proof once the site opens in the detail workspace."
            : isNetworkStatic
              ? "The static site gets deployed first, but live request proof stays blocked until readiness changes to ready."
              : "This setup path still shows the full control-plane workflow, but request proof stays blocked until readiness changes to ready."}
        </div>

        {error ? <div className="alert">{error}</div> : null}

        <div className="row">
          <button
            className="button"
            disabled={isPending || hostname.trim() === "" || projectName.trim() === "" || origin.trim() === ""}
            onClick={() => startTransition(async () => {
              await createZone()
            })}
            type="button"
          >
            {isPending ? "Creating site..." : "Create site and continue setup"}
          </button>
          <button className="button-secondary" onClick={() => router.push("/domains")} type="button">
            Back to domains
          </button>
        </div>
      </div>
    </div>
  )
}
