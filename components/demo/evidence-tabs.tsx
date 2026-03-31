"use client"

import React, { useState } from "react"
import { ApiLogPanel } from "./api-log-panel"
import { EdgeLogPanel } from "./edge-log-panel"
import { RequestProofPanel } from "./request-proof-panel"
import type { RequestProof, ServiceLog } from "../../services/shared/src/types"

type Props = {
  domainId: string
  domainStatus: "ready" | "pending"
  initialProofs: RequestProof[]
  initialEdgeLogs: ServiceLog[]
  initialApiLogs: ServiceLog[]
  onRequestComplete?: (proof: RequestProof) => Promise<void> | void
}

export function EvidenceTabs({
  domainId,
  domainStatus,
  initialProofs,
  initialEdgeLogs,
  initialApiLogs,
  onRequestComplete,
}: Props) {
  const [tab, setTab] = useState<"proof" | "edge" | "api">("proof")
  const [edgeLogs, setEdgeLogs] = useState(initialEdgeLogs)
  const [apiLogs, setApiLogs] = useState(initialApiLogs)
  const [latestProof, setLatestProof] = useState<RequestProof | null>(initialProofs[0] ?? null)

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
      <div className="row">
        <button className={tab === "proof" ? "button" : "button-secondary"} onClick={() => setTab("proof")} type="button">Request proof</button>
        <button className={tab === "edge" ? "button" : "button-secondary"} onClick={() => setTab("edge")} type="button">Rust edge logs</button>
        <button className={tab === "api" ? "button" : "button-secondary"} onClick={() => setTab("api")} type="button">Go API logs</button>
      </div>

      {tab === "proof" ? (
        <RequestProofPanel
          domainId={domainId}
          domainStatus={domainStatus}
          initialProofs={initialProofs}
          onRequestComplete={refreshLogs}
        />
      ) : null}
      {tab === "edge" ? <EdgeLogPanel logs={edgeLogs} /> : null}
      {tab === "api" ? <ApiLogPanel logs={apiLogs} /> : null}
    </div>
  )
}
