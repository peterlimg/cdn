import React from "react"
export function QuotaThresholdBanner({ reached }: { reached: boolean }) {
  if (!reached) {
    return (
      <div className="note">
        <strong>Quota contract:</strong> usage is counted synchronously on the request path. Once the
        free-plan threshold is reached, the next edge request is blocked and the dashboard reflects
        the same state.
      </div>
    )
  }

  return (
    <div className="alert">
      <strong>Free-plan limit reached.</strong> The edge now blocks additional requests for this tenant
      until more balance is added. The blocked state is part of the live product demo.
    </div>
  )
}
