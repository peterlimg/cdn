"use client"

import React, { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { SetupPath } from "../../services/shared/src/types"

const defaultHostnames = {
  ready: "ready-site.northstarcdn.test",
  pending: "pending-site.northstarcdn.test",
} as const

const defaultOrigins: Record<SetupPath, string> = {
  "existing-origin": "https://static.example.com",
  "network-static": "http://ready-origin:80",
  "demo-static": "http://127.0.0.1:3000/origin",
}

const defaultHealthCheckPaths: Record<SetupPath, string> = {
	"existing-origin": "/",
	"network-static": "/assets/demo.css",
	"demo-static": "/assets/demo.css",
}

export function NewDomainForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMode = searchParams.get("mode") === "pending" ? "pending" : "ready"
  const initialSetupPath = (searchParams.get("setupPath") as SetupPath | null) ?? "existing-origin"

  const [mode, setMode] = useState<"ready" | "pending">(initialMode)
  const [projectName, setProjectName] = useState("My static site")
  const [setupPath, setSetupPath] = useState<SetupPath>(initialSetupPath)
  const [hostname, setHostname] = useState<string>(defaultHostnames[initialMode])
  const [origin, setOrigin] = useState<string>(defaultOrigins[initialSetupPath])
  const [healthCheckPath, setHealthCheckPath] = useState<string>(defaultHealthCheckPaths[initialSetupPath])
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
      body: JSON.stringify({ hostname, mode, projectName, origin, healthCheckPath, setupPath }),
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
      <section className="surface stack create-zone-shell">
        <div>
          <span className="eyebrow">Add pull zone</span>
          <h2 className="section-title">Create a new pull zone</h2>
          <p className="section-copy muted">
            Enter the hostname customers will use and the origin URL the CDN should pull from. Advanced setup stays available after the zone is created.
          </p>
        </div>

        <div className="note create-zone-note">
          Start with one hostname and one origin. After creation, the zone detail page becomes the place to finish setup, send proof, and inspect logs.
        </div>

        <div className="field">
          <label htmlFor="projectName">Zone name</label>
          <input
            className="input"
            id="projectName"
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="Marketing site"
            value={projectName}
          />
          <div className="small muted">Internal label for this CDN zone.</div>
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
            placeholder="ready-site.northstarcdn.test"
            value={hostname}
          />
          <div className="small muted">The public hostname visitors will use for this site.</div>
        </div>

        <div className="field">
          <label htmlFor="origin">Origin URL</label>
          <input
            className="input"
            id="origin"
            onChange={(event) => setOrigin(event.target.value)}
            placeholder="https://static.example.com"
            value={origin}
          />
          <div className="small muted">The source server the CDN will contact on cache misses.</div>
        </div>

        <div className="field">
          <label htmlFor="healthCheckPath">Health check path</label>
          <input
            className="input"
            id="healthCheckPath"
            onChange={(event) => setHealthCheckPath(event.target.value)}
            placeholder="/"
            value={healthCheckPath}
          />
          <div className="small muted">
            Optional. Defaults to <code>/</code> for public origins and can be changed later.
          </div>
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
            {isPending ? "Creating zone..." : "Create pull zone"}
          </button>
          <button className="button-secondary" onClick={() => router.push("/domains")} type="button">
            Cancel
          </button>
        </div>
      </section>
    </div>
  )
}
