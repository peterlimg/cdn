"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { DNSRecord } from "../../services/shared/src/types"
import { displayRouteLabel } from "../../lib/ui/display"

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
	const [projectNameValue, setProjectNameValue] = useState(projectName || "")
	const [originValue, setOriginValue] = useState(origin)
	const [healthCheckPathValue, setHealthCheckPathValue] = useState(healthCheckPath || "/")
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
    <div className="card stack builder-card">
      <div>
        <span className="eyebrow">Setup</span>
        <h3>Connect your origin</h3>
        <p className="muted small">
          Start with the origin details below. Once the origin is healthy, verify DNS and then send a request through the edge.
        </p>
      </div>

      <div className="list-item stack builder-list-item">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="eyebrow">Origin</span>
            <h4 style={{ marginBottom: 4 }}>{origin}</h4>
            <div className="small muted">Health check: {displayRouteLabel(healthCheckPath || "/")}</div>
          </div>
          <div className="badge pending">{proxyMode ?? "proxied"}</div>
        </div>
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
      </div>

      <div className="list-item stack builder-list-item">
        <div>
		  <span className="eyebrow">Edit</span>
		  <h4>Save origin settings</h4>
        </div>
        <div className="field">
          <div className="field">
            <label htmlFor={`project-name-${domainId}`}>Project name</label>
            <input
              className="input"
              id={`project-name-${domainId}`}
              onChange={(event) => setProjectNameValue(event.target.value)}
              value={projectNameValue}
            />
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
		  Next step: save the origin details, re-run the check if needed, then verify DNS when the origin is healthy.
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
			{isPending ? "Saving..." : "Save origin"}
          </button>
          <button
            className="button-secondary"
            disabled={isPending || originValue.trim() === ""}
            onClick={() => startTransition(async () => {
              await recheckOrigin()
            })}
            type="button"
          >
			{isPending ? "Checking..." : "Check origin"}
          </button>
          <button
            className="button-secondary"
            disabled={isPending || dnsStatus === "verified" || originStatus !== "healthy"}
            onClick={() => startTransition(async () => {
              await verifyDns()
            })}
            type="button"
          >
			{dnsStatus === "verified" ? "DNS verified" : "Verify DNS"}
          </button>
        </div>
      </div>

      <div className="stack dns-list">
        {dnsRecords.map((record) => (
          <DNSRow key={`${record.host}-${record.type}`} record={record} />
        ))}
      </div>
    </div>
  )
}
