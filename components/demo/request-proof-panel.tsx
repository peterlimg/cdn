"use client"

import React from "react"
import type { RequestProof } from "../../services/shared/src/types"

export function RequestProofPanel({
  domainStatus,
  proofs,
  isPending,
  error,
  onSendRequest,
}: {
  domainStatus: "ready" | "pending"
  proofs: RequestProof[]
  isPending: boolean
  error?: string | null
  onSendRequest: () => void
}) {
  return (
    <div className="surface stack request-proof-panel builder-subpanel">
      <div className="section-header">
        <div>
          <span className="eyebrow">{domainStatus === "ready" ? "Live proof" : "Blocked proof"}</span>
          <h3 style={{ margin: "6px 0 0" }}>
            {domainStatus === "ready" ? "Test traffic through the edge" : "Traffic is blocked until setup is complete"}
          </h3>
          <p className="muted small request-proof-copy">
            Use this panel to confirm whether the edge can reach your origin and what happened to the request.
          </p>
        </div>
        <button
          className="button"
          disabled={isPending}
          onClick={onSendRequest}
          type="button"
        >
          {isPending ? "Sending request..." : domainStatus === "ready" ? "Send test request" : "Show blocked request"}
        </button>
      </div>

      {error ? <div className="note">{error}</div> : null}

      <div className="proof-log proof-log-compact">
        {proofs.length === 0 ? (
          <div className="note">
            {domainStatus === "ready"
              ? "No test requests yet. Send one request to confirm the CDN can reach this zone."
              : "This zone is not ready yet. Finish setup, then come back and test traffic."}
          </div>
        ) : (
          proofs.map((proof) => (
            <div className="proof-entry proof-entry-compact" key={proof.requestId}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <strong className="proof-request-id">{proof.requestId}</strong>
                <div className={`badge ${proof.finalDisposition === "served" ? "ready" : "reached"}`}>
                  {proof.cacheStatus}
                </div>
              </div>

              <p className="small proof-message">{proof.message}</p>

              <div className="proof-entry-meta small muted">
                <span>Revision {proof.revisionId}</span>
                <span>{new Date(proof.timestamp).toLocaleTimeString()}</span>
                <span>Bytes {proof.bytesServed.toLocaleString()}</span>
                <span>Trace {proof.traceId ?? "n/a"}</span>
                <span>Quota {proof.quotaUsedBytes.toLocaleString()} / {proof.quotaLimitBytes.toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
