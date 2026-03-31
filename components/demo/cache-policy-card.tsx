"use client"

import React from "react"
import { useTransition } from "react"

type Props = {
  domainId: string
  cacheEnabled: boolean
  revisionLabel: string
  onChanged: () => Promise<void> | void
}

export function CachePolicyCard({ domainId, cacheEnabled, revisionLabel, onChanged }: Props) {
  const [isPending, startTransition] = useTransition()

  async function updatePolicy(nextValue: boolean) {
    await fetch("/api/policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domainId, cacheEnabled: nextValue }),
    })
  }

  async function rollbackPolicy() {
    await fetch("/api/policy", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domainId }),
    })
  }

  return (
    <div className="card stack">
      <div>
        <span className="eyebrow">Primary control</span>
        <h3>Cache policy for /assets/demo.css</h3>
        <p className="muted small">
          Keep this route uncached to show baseline origin fetches, then enable edge cache to prove
          MISS to HIT with the next repeated request.
        </p>
      </div>

      <div className="list-item stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <strong>{cacheEnabled ? "Cache enabled" : "Baseline origin fetch only"}</strong>
            <div className="small muted">{revisionLabel}</div>
          </div>
          <div className={`badge ${cacheEnabled ? "ready" : "pending"}`}>
            {isPending ? "Publishing..." : cacheEnabled ? "Active on edge" : "Baseline active"}
          </div>
        </div>

        <div className="row">
          <button
            className="button"
            disabled={isPending || cacheEnabled}
            onClick={() => startTransition(async () => {
              await updatePolicy(true)
              await onChanged()
            })}
            type="button"
          >
            Enable edge cache
          </button>
          <button
            className="button-secondary"
            disabled={isPending || !cacheEnabled}
            onClick={() => startTransition(async () => {
              await rollbackPolicy()
              await onChanged()
            })}
            type="button"
          >
            Roll back to baseline
          </button>
        </div>
      </div>
    </div>
  )
}
