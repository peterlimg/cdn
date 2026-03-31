import React from "react"
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
  origin,
  dnsRecords,
  proxyMode,
  routeHint,
}: {
  domainId: string
  origin: string
  dnsRecords: DNSRecord[]
  proxyMode?: string
  routeHint?: string
}) {
  const liveRoute = routeHint ?? "/assets/demo.css"
  const proxiedCheckUrl = `/api/proxy-check?domainId=${domainId}&path=${encodeURIComponent(liveRoute)}`

  return (
    <div className="card stack">
      <div>
        <span className="eyebrow">Domain configuration</span>
        <h3>What is configured here</h3>
        <p className="muted small">
          This is onboarding/product shape, not a full DNS host. It shows the exact records,
          origin target, and proxy behavior required for this demo route.
        </p>
      </div>

      <div className="list-item stack">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="eyebrow">Origin</span>
            <h4 style={{ marginBottom: 4 }}>{origin}</h4>
          </div>
          <div className="badge pending">{proxyMode ?? "proxied"}</div>
        </div>
        <div className="small muted">Request route hint: {liveRoute}</div>
        <div className="note stack" style={{ gap: 8 }}>
          <div className="small">
            Real edge check: <code>{proxiedCheckUrl}</code>
          </div>
          <div className="small muted">
            Use this proxied asset URL from either the direct UI or the ingress-backed demo to rehearse the actual edge response path. The response returns
            <code> X-Request-Id</code>, <code> X-Trace-Id</code>, and <code> X-Cache-Status</code>
            headers for correlation back to proof and logs.
          </div>
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
