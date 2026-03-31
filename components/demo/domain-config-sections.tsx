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
  origin,
  dnsRecords,
  proxyMode,
  routeHint,
}: {
  origin: string
  dnsRecords: DNSRecord[]
  proxyMode?: string
  routeHint?: string
}) {
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
        <div className="small muted">Live proof route: {routeHint ?? "/assets/demo.css"}</div>
      </div>

      <div className="stack">
        {dnsRecords.map((record) => (
          <DNSRow key={`${record.host}-${record.type}`} record={record} />
        ))}
      </div>
    </div>
  )
}
