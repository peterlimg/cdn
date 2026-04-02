import React from "react"
import type { EdgeRollout } from "../../services/shared/src/types"

export function PolicyRevisionBanner({
  activeRevisionId,
  appliedRevisionId,
  rollout,
}: {
  activeRevisionId: string
  appliedRevisionId: string
  rollout?: EdgeRollout
}) {
  const confirmed = activeRevisionId === appliedRevisionId
  const rolloutCopy = rollout
    ? `Targets ${rollout.targetNodeCount}, applied ${rollout.appliedNodeCount}, pending ${rollout.pendingNodeCount}, failed ${rollout.failedNodeCount}`
    : null

  return (
    <div className="surface revision-banner builder-subpanel revision-banner-builder">
      <div className="revision-banner-label">Active revision</div>
      <div className="revision-banner-value">{activeRevisionId}</div>
      <div className="small muted">
        Edge apply status: {confirmed ? "confirmed on edge" : `publishing, last applied ${appliedRevisionId}`}
      </div>
      {rolloutCopy ? <div className="small muted">Rollout: {rolloutCopy}</div> : null}
    </div>
  )
}
