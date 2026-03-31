"use client"

import React from "react"
import { useState, useTransition } from "react"
import type { RequestProof } from "../../services/shared/src/types"

export function RequestProofPanel({
  domainId,
  domainStatus,
  initialProofs,
  onRequestComplete,
}: {
  domainId: string
  domainStatus: "ready" | "pending"
  initialProofs: RequestProof[]
  onRequestComplete?: (proof: RequestProof) => Promise<void> | void
}) {
  const [proofs, setProofs] = useState(initialProofs)
  const [isPending, startTransition] = useTransition()

  async function sendRequest() {
    const response = await fetch("/api/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domainId }),
    })
    const proof = (await response.json()) as RequestProof
    setProofs((current) => [proof, ...current])
    await onRequestComplete?.(proof)
  }

  return (
    <div className="card stack">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span className="eyebrow">{domainStatus === "ready" ? "Live proof" : "Blocked proof"}</span>
          <h3>{domainStatus === "ready" ? "Request path evidence" : "Readiness-bound request evidence"}</h3>
        </div>
        <button
          className="button"
          disabled={isPending}
          onClick={() => startTransition(async () => {
            await sendRequest()
          })}
          type="button"
        >
          {isPending ? "Sending request..." : domainStatus === "ready" ? "Send request through edge" : "Show blocked request proof"}
        </button>
      </div>

      <p className="muted small">
        This panel is the buyer-readable summary of one request. Use the tabs beside it to drill into
        Rust edge logs and Go API logs for the same request ID and trace ID. If analytics later show
        `Updating` or `Degraded`, this panel is still the immediate truth for the request path.
      </p>

      <div className="proof-log">
        {proofs.length === 0 ? (
          <div className="note">
            {domainStatus === "ready"
              ? "No edge requests yet. Publish a policy, then send traffic to produce proof."
              : "No blocked proof yet. Send one request to show how pending zones stay blocked by design."}
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
