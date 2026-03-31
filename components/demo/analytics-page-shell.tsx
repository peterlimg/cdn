import React from "react"
import { AnalyticsSummaryCards } from "./analytics-summary-cards"
import { CacheValueCard } from "./cache-value-card"
import { QuotaStatusCard } from "./quota-status-card"
import { QuotaThresholdBanner } from "./quota-threshold-banner"
import type { AnalyticsSummary } from "../../services/shared/src/types"

export function AnalyticsPageShell({ summary }: { summary: AnalyticsSummary }) {
  return (
    <div className="grid stack">
      <QuotaThresholdBanner reached={summary.quotaReached} />
      <AnalyticsSummaryCards summary={summary} />
      <div className="grid two-col">
        <CacheValueCard bytes={summary.cacheValueBytes} />
        <QuotaStatusCard
          usedBytes={summary.quotaUsedBytes}
          limitBytes={summary.quotaLimitBytes}
          reached={summary.quotaReached}
        />
      </div>
    </div>
  )
}
