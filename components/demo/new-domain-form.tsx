"use client"

import React, { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { EdgeNode, SetupPath } from "../../services/shared/src/types"

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

export function NewDomainForm({ edgeNodes }: { edgeNodes: EdgeNode[] }) {
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
  const [edgePlacementMode, setEdgePlacementMode] = useState<"all-eligible" | "subset">("all-eligible")
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [showAdvancedNodes, setShowAdvancedNodes] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const placementSummary = edgePlacementMode === "subset"
    ? `Deploying to ${selectedNodeIds.length || 0} selected edge node${selectedNodeIds.length === 1 ? "" : "s"}`
    : `Deploying to all ${edgeNodes.length} eligible edge node${edgeNodes.length === 1 ? "" : "s"}`

  function toggleNode(nodeId: string) {
    setSelectedNodeIds((current) => current.includes(nodeId)
      ? current.filter((id) => id !== nodeId)
      : [...current, nodeId])
  }

  function setPlacementMode(mode: "all-eligible" | "subset") {
    setEdgePlacementMode(mode)
    if (mode === "all-eligible") {
      setSelectedNodeIds([])
    }
  }

  async function createZone() {
    setError(null)
    const response = await fetch("/api/reseed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hostname,
        mode,
        projectName,
        origin,
        healthCheckPath,
        setupPath,
        edgePlacementMode,
        edgeSelectedNodeIds: edgePlacementMode === "subset" ? selectedNodeIds : [],
      }),
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

        <div className="note stack create-zone-note" style={{ gap: 8 }}>
          <div>
            <strong>{placementSummary}</strong>
          </div>
          <div className="small muted">
            {edgeNodes.map((node) => `${node.label} (${node.region})`).join(", ")}
          </div>
          <div>
            <button
              className="button-secondary"
              onClick={() => setShowAdvancedNodes((current) => !current)}
              type="button"
            >
              {showAdvancedNodes ? "Hide edge placement options" : "Choose specific edge nodes"}
            </button>
          </div>
        </div>

        {showAdvancedNodes ? (
          <div className="field">
            <label>Edge placement</label>
            <div className="stack small muted" style={{ gap: 8 }}>
              <label>
                <input
                  checked={edgePlacementMode === "all-eligible"}
                  name="edgePlacementMode"
                  onChange={() => setPlacementMode("all-eligible")}
                  type="radio"
                />{" "}
                All eligible edge nodes
              </label>
              <label>
                <input
                  checked={edgePlacementMode === "subset"}
                  name="edgePlacementMode"
                  onChange={() => setPlacementMode("subset")}
                  type="radio"
                />{" "}
                Only selected edge nodes
              </label>
            </div>
            {edgePlacementMode === "subset" ? (
              <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                {edgeNodes.map((node) => (
                  <label className="small muted" key={node.id}>
                    <input
                      checked={selectedNodeIds.includes(node.id)}
                      onChange={() => toggleNode(node.id)}
                      type="checkbox"
                    />{" "}
                    {node.label} ({node.region})
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

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
