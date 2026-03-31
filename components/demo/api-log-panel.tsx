import React from "react"
import type { ServiceLog } from "../../services/shared/src/types"

export function ApiLogPanel({ logs, expectedEmpty }: { logs: ServiceLog[]; expectedEmpty?: boolean }) {
  return (
    <div className="card stack">
      <div>
        <span className="eyebrow">Go API logs</span>
        <h3>Why the control plane did or did not participate</h3>
      </div>
      {logs.length === 0 ? (
        <div className="note">
          {expectedEmpty
            ? "Expected empty: a cache hit can be fully satisfied by the Rust edge without new Go API work for that request."
            : "No API logs yet. Publish a policy or send a baseline request to show Go service activity."}
        </div>
      ) : (
        <div className="proof-log">
          {logs.map((log) => (
            <div className="proof-entry" key={log.id}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{log.event}</strong>
                <div className="badge pending">{log.outcome}</div>
              </div>
              <div className="proof-grid small muted">
                <span>Request: {log.requestId}</span>
                <span>Trace: {log.traceId}</span>
                <span>Revision: {log.revisionId}</span>
                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="small" style={{ marginBottom: 0 }}>{log.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
