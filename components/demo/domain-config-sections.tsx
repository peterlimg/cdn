"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { DNSRecord } from "../../services/shared/src/types"

function DNSRow({ record }: { record: DNSRecord }) {
  return (
    <div className="list-item">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <strong>{record.host}</strong>
          <div className="small muted">{record.purpose}</div>
        </div>
        <div className="badge ready">{record.proxied ? "proxied" : "dns only"}</div>
      </div>
      <div className="proof-grid small muted" style={{ marginTop: 12 }}>
        <span>Type: {record.type}</span>
        <span>TTL: {record.ttl}s</span>
        <span>Target: {record.value}</span>
      </div>
    </div>
  )
}

export function DomainConfigSections({
  domainId,
  projectName,
  origin,
  healthCheckPath,
  setupPath,
  setupStage,
  originStatus,
  originValidationMessage,
  lastOriginCheckAt,
  lastOriginCheckOutcome,
  dnsStatus,
  dnsRecords,
  proxyMode,
  routeHint,
}: {
  domainId: string
  projectName?: string
  origin: string
  healthCheckPath?: string
  setupPath?: string
  setupStage?: string
  originStatus?: string
  originValidationMessage?: string
  lastOriginCheckAt?: string
  lastOriginCheckOutcome?: string
  dnsStatus?: string
  dnsRecords: DNSRecord[]
  proxyMode?: string
  routeHint?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const liveRoute = routeHint ?? "/assets/demo.css"
  const proxiedCheckUrl = `/api/proxy-check?domainId=${domainId}&path=${encodeURIComponent(liveRoute)}`
  const [projectNameValue, setProjectNameValue] = useState(projectName || "")
  const [originValue, setOriginValue] = useState(origin)
  const [healthCheckPathValue, setHealthCheckPathValue] = useState(healthCheckPath || "/assets/demo.css")
  const [setupPathValue, setSetupPathValue] = useState(setupPath || "demo-static")
  const [error, setError] = useState<string | null>(null)

  async function saveOriginSetup() {
    setError(null)
    const response = await fetch(`/api/domains/${domainId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: projectNameValue,
          origin: originValue,
          healthCheckPath: healthCheckPathValue,
          setupPath: setupPathValue,
        }),
    })

    const payload = await response.json().catch(() => ({ error: "failed to update site setup" }))
    if (!response.ok) {
      setError(payload.error ?? "failed to update site setup")
      router.refresh()
      return
    }

    router.refresh()
  }

  async function recheckOrigin() {
    setError(null)
    const response = await fetch(`/api/domains/${domainId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "recheck-origin" }),
    })

    const payload = await response.json().catch(() => ({ error: "failed to recheck origin" }))
    if (!response.ok) {
      setError(payload.error ?? "failed to recheck origin")
      router.refresh()
      return
    }

    router.refresh()
  }

  async function verifyDns() {
    setError(null)
    const response = await fetch(`/api/domains/${domainId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify-dns" }),
    })

    const payload = await response.json().catch(() => ({ error: "failed to verify dns" }))
    if (!response.ok) {
      setError(payload.error ?? "failed to verify dns")
      router.refresh()
      return
    }

    router.refresh()
  }

  return (
    <div className="card stack">
      <div>
        <span className="eyebrow">Setup configuration</span>
        <h3>Origin, DNS, and route configuration</h3>
        <p className="muted small">
          This section shows what the site will route to, what DNS records are required, and how the
          first proof request reaches the edge.
        </p>
      </div>

      <div className="list-item stack">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="eyebrow">Origin</span>
            <h4 style={{ marginBottom: 4 }}>{origin}</h4>
            <div className="small muted">Path: {setupPath || "demo-static"}</div>
            <div className="small muted">Health check: {healthCheckPath || "/assets/demo.css"}</div>
          </div>
          <div className="badge pending">{proxyMode ?? "proxied"}</div>
        </div>
        <div className="small muted">Request route hint: {liveRoute}</div>
        <div className="proof-grid small muted">
          <span>Origin status: {originStatus || "pending"}</span>
          <span>DNS status: {dnsStatus || "pending"}</span>
        </div>
        {lastOriginCheckAt ? (
          <div className="small muted">
            Last origin check: {lastOriginCheckOutcome || originStatus || "pending"} at {lastOriginCheckAt}
          </div>
        ) : null}
        {originValidationMessage ? <div className="small muted">{originValidationMessage}</div> : null}
        <div className="note stack" style={{ gap: 8 }}>
          <div className="small">
            Real edge check: <code>{proxiedCheckUrl}</code>
          </div>
          <div className="small muted">
            Use this proxied asset URL to confirm the route really passes through the edge. The response returns
            <code> X-Request-Id</code>, <code> X-Trace-Id</code>, and <code> X-Cache-Status</code>
            headers for correlation back to proof and logs.
          </div>
        </div>
      </div>

      <div className="list-item stack">
        <div>
          <span className="eyebrow">Update setup</span>
          <h4>Connect origin and advance verification</h4>
        </div>
        <div className="proof-grid">
          <div className="field">
            <label htmlFor={`project-name-${domainId}`}>Project name</label>
            <input
              className="input"
              id={`project-name-${domainId}`}
              onChange={(event) => setProjectNameValue(event.target.value)}
              value={projectNameValue}
            />
          </div>
          <div className="field">
            <label htmlFor={`setup-path-${domainId}`}>Origin path</label>
            <select
              className="select"
              id={`setup-path-${domainId}`}
              onChange={(event) => setSetupPathValue(event.target.value)}
            value={setupPathValue}
          >
            <option value="existing-origin">Connect an existing static origin</option>
            <option value="network-static">Deploy a static site on the network</option>
            <option value="demo-static">Use a demo static origin</option>
          </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor={`origin-url-${domainId}`}>Origin URL</label>
          <input
            className="input"
            id={`origin-url-${domainId}`}
            onChange={(event) => setOriginValue(event.target.value)}
            value={originValue}
          />
        </div>
        <div className="field">
          <label htmlFor={`health-check-path-${domainId}`}>Health check path</label>
          <input
            className="input"
            id={`health-check-path-${domainId}`}
            onChange={(event) => setHealthCheckPathValue(event.target.value)}
            value={healthCheckPathValue}
          />
        </div>
        <div className="small muted">
          Current setup stage: {setupStage || "created"}. Save origin details first, then verify DNS when the
          required records are in place.
        </div>
        {originStatus === "failed" && originValidationMessage ? <div className="alert">{originValidationMessage}</div> : null}
        {error ? <div className="alert">{error}</div> : null}
        <div className="row">
          <button
            className="button"
            disabled={isPending || originValue.trim() === "" || setupPathValue.trim() === ""}
            onClick={() => startTransition(async () => {
              await saveOriginSetup()
            })}
            type="button"
          >
            {isPending ? "Saving setup..." : "Save origin setup"}
          </button>
          <button
            className="button-secondary"
            disabled={isPending || originValue.trim() === ""}
            onClick={() => startTransition(async () => {
              await recheckOrigin()
            })}
            type="button"
          >
            {isPending ? "Checking origin..." : "Re-run origin check"}
          </button>
          <button
            className="button-secondary"
            disabled={isPending || dnsStatus === "verified" || originStatus !== "healthy"}
            onClick={() => startTransition(async () => {
              await verifyDns()
            })}
            type="button"
          >
            {dnsStatus === "verified" ? "DNS verified" : "Verify DNS and activate"}
          </button>
        </div>
      </div>

      <div className="stack">
        {dnsRecords.map((record) => (
          <DNSRow key={`${record.host}-${record.type}`} record={record} />
        ))}
      </div>
    </div>
  )
}
