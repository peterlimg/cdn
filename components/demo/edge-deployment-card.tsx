import React from "react"
import type { EdgePlacement, EdgeRollout } from "../../services/shared/src/types"

export function EdgeDeploymentCard({
  placement,
  rollout,
}: {
  placement?: EdgePlacement
  rollout?: EdgeRollout
}) {
  if (!placement || !rollout) {
    return null
  }

  return (
    <div className="card stack">
      <div>
        <span className="eyebrow">Edge deployment</span>
        <h3>Where this zone should run</h3>
        <p className="muted small">{placement.summary}</p>
      </div>

      <div className="proof-grid small muted">
        <span>Targets: {rollout.targetNodeCount}</span>
        <span>Applied: {rollout.appliedNodeCount}</span>
        <span>Pending: {rollout.pendingNodeCount}</span>
        <span>Failed: {rollout.failedNodeCount}</span>
      </div>

      <div className="proof-log">
        {rollout.nodes.map((node) => (
          <div className="proof-entry" key={node.nodeId}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>{node.label}</strong>
              <div className={`badge ${node.status === "applied" ? "ready" : node.status === "failed" ? "reached" : "pending"}`}>
                {node.status}
              </div>
            </div>
            <div className="proof-grid small muted">
              <span>Region: {node.region}</span>
              <span>Node: {node.nodeId}</span>
              <span>Last applied: {node.appliedRevisionId || "pending"}</span>
              <span>Verification route: {node.verificationPath}</span>
            </div>
            {node.lastError ? <p className="small" style={{ marginBottom: 0 }}>{node.lastError}</p> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
