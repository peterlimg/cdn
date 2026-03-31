import React from "react"
import type { ServiceLog } from "../../services/shared/src/types"

export function EdgeLogPanel({ logs }: { logs: ServiceLog[] }) {
  return (
    <div className="card stack">
      <div>
        <span className="eyebrow">Rust edge logs</span>
        <h3>Why the edge served, cached, or blocked</h3>
      </div>
      {logs.length === 0 ? (
        <div className="note">No edge logs yet. Send a request through the Rust edge to populate this panel.</div>
      ) : (
        <div className="proof-log">
          {logs.map((log) => (
            <div className="proof-entry" key={log.id}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{log.event}</strong>
                <div className="badge ready">{log.outcome}</div>
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
