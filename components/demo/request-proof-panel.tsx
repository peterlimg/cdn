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
    <div className="card stack">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span className="eyebrow">{domainStatus === "ready" ? "Live proof" : "Blocked proof"}</span>
		  <h3>{domainStatus === "ready" ? "Test traffic through the edge" : "Traffic is blocked until setup is complete"}</h3>
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

      <p className="muted small">
		Use this panel to confirm whether the edge can reach your origin and what happened to the request.
      </p>

      {error ? <div className="note">{error}</div> : null}

      <div className="proof-log">
        {proofs.length === 0 ? (
          <div className="note">
            {domainStatus === "ready"
			  ? "No test requests yet. Send one request to confirm the CDN can reach this zone."
			  : "This zone is not ready yet. Finish setup, then come back and test traffic."}
          </div>
        ) : (
          proofs.map((proof) => (
            <div className="proof-entry" key={proof.requestId}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{proof.requestId}</strong>
                <div className={`badge ${proof.finalDisposition === "served" ? "ready" : "reached"}`}>
                  {proof.cacheStatus}
                </div>
              </div>
              <div className="proof-grid small muted">
                <span>Revision: {proof.revisionId}</span>
                <span>Trace: {proof.traceId ?? "n/a"}</span>
                <span>Bytes: {proof.bytesServed.toLocaleString()}</span>
                <span>Quota: {proof.quotaUsedBytes.toLocaleString()} / {proof.quotaLimitBytes.toLocaleString()}</span>
                <span>{new Date(proof.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="small" style={{ marginBottom: 0 }}>{proof.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
