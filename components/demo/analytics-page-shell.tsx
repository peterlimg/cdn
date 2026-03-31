import React from "react"
import { AnalyticsSummaryCards } from "./analytics-summary-cards"
import { CacheValueCard } from "./cache-value-card"
import { QuotaStatusCard } from "./quota-status-card"
import { QuotaThresholdBanner } from "./quota-threshold-banner"
import type { AnalyticsSummary } from "../../services/shared/src/types"

export function AnalyticsPageShell({ summary }: { summary: AnalyticsSummary }) {
  return (
    <div className="grid stack">
      {summary.freshness === "updating" ? (
        <div className="note">
          <strong>Derived-with-lag:</strong> analytics are currently catching up from ClickHouse-backed
          event storage. Request proof and service logs remain the immediate source of truth.
        </div>
      ) : null}
      {summary.freshness === "degraded" ? (
        <div className="alert">
          <strong>Analytics degraded:</strong> ClickHouse-backed analytics are currently unavailable, so
          this view is falling back to local event summaries. Request proof and service logs remain the
          immediate source of truth.
        </div>
      ) : null}
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
