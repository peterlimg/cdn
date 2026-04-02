"use client"

import React, { useEffect, useState, useTransition } from "react"
import { ApiLogPanel } from "./api-log-panel"
import { EdgeLogPanel } from "./edge-log-panel"
import { RequestProofPanel } from "./request-proof-panel"
import type { EdgeRollout, RequestProof, ServiceLog } from "../../services/shared/src/types"

type Props = {
  domainId: string
  domainStatus: "ready" | "pending"
  routeHint?: string
  rollout?: EdgeRollout
  initialProofs: RequestProof[]
  initialEdgeLogs: ServiceLog[]
  initialApiLogs: ServiceLog[]
  onRequestComplete?: (proof: RequestProof) => Promise<void> | void
}

export function EvidenceTabs({
  domainId,
  domainStatus,
  routeHint,
  rollout,
  initialProofs,
  initialEdgeLogs,
  initialApiLogs,
  onRequestComplete,
}: Props) {
  const [tab, setTab] = useState<"proof" | "edge" | "api">("proof")
  const [proofs, setProofs] = useState(initialProofs)
  const [edgeLogs, setEdgeLogs] = useState(initialEdgeLogs)
  const [apiLogs, setApiLogs] = useState(initialApiLogs)
  const [latestProof, setLatestProof] = useState<RequestProof | null>(initialProofs[0] ?? null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setProofs(initialProofs)
  }, [initialProofs])

  useEffect(() => {
    setEdgeLogs(initialEdgeLogs)
  }, [initialEdgeLogs])

  useEffect(() => {
    setApiLogs(initialApiLogs)
  }, [initialApiLogs])

  useEffect(() => {
    setLatestProof(initialProofs[0] ?? null)
  }, [initialProofs])

  async function sendRequest(targetNodeId?: string) {
    setRequestError(null)
    const response = await fetch("/api/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domainId, path: routeHint || "/", targetNodeId }),
    })
    const payload = (await response.json()) as RequestProof | { error?: string }
    if (!response.ok) {
      const message = "error" in payload && payload.error ? payload.error : "Request through edge failed"
      setRequestError(message)
      return
    }

    const proof = payload as RequestProof
    setProofs((current) => [proof, ...current])
    await refreshLogs(proof)
  }

  async function refreshLogs(proof: RequestProof) {
    setLatestProof(proof)
    const [edgeResponse, apiResponse] = await Promise.all([
      fetch(`/api/logs?domainId=${domainId}&service=edge&requestId=${proof.requestId}`, { cache: "no-store" }),
      fetch(`/api/logs?domainId=${domainId}&service=api&requestId=${proof.requestId}`, { cache: "no-store" }),
    ])

    setEdgeLogs((await edgeResponse.json()) as ServiceLog[])
    setApiLogs((await apiResponse.json()) as ServiceLog[])
    await onRequestComplete?.(proof)
  }

  return (
    <div className="stack">
      <div className="row tab-row">
        <button className={tab === "proof" ? "button" : "button-secondary"} onClick={() => setTab("proof")} type="button">Request proof</button>
        <button className={tab === "edge" ? "button" : "button-secondary"} onClick={() => setTab("edge")} type="button">Rust edge logs</button>
        <button className={tab === "api" ? "button" : "button-secondary"} onClick={() => setTab("api")} type="button">Go API logs</button>
      </div>

      {tab === "proof" ? (
        <RequestProofPanel
          domainStatus={domainStatus}
          proofs={proofs}
          rollout={rollout}
          isPending={isPending}
          error={requestError}
          onSendRequest={(targetNodeId) => startTransition(() => {
            void sendRequest(targetNodeId)
          })}
        />
      ) : null}
      {tab === "edge" ? <EdgeLogPanel logs={edgeLogs} /> : null}
      {tab === "api" ? <ApiLogPanel logs={apiLogs} /> : null}
    </div>
  )
}
