import React from "react"
import { AnalyticsSummaryCards } from "./analytics-summary-cards"
import { CacheValueCard } from "./cache-value-card"
import { QuotaStatusCard } from "./quota-status-card"
import { QuotaThresholdBanner } from "./quota-threshold-banner"
import type { AnalyticsSummary } from "../../services/shared/src/types"

export function AnalyticsPageShell({ summary }: { summary: AnalyticsSummary }) {
  return (
    <div className="grid stack analytics-shell">
      <div className="surface surface-subtle stack builder-subpanel analytics-status-panel">
        {summary.freshness === "updating" ? (
          <div className="note">
            <strong>Derived-with-lag:</strong> analytics are currently catching up from ClickHouse-backed
            event storage. Request proof and service logs remain the immediate source of truth.
          </div>
        ) : null}
        {summary.freshness === "degraded" ? (
          <div className="alert">
            <strong>Analytics degraded:</strong> this view is using guarded local event summaries after a
            ClickHouse analytics failure. Request proof and service logs remain the immediate source of
            truth.
          </div>
        ) : null}
        <QuotaThresholdBanner reached={summary.quotaReached} />
      </div>

      <AnalyticsSummaryCards summary={summary} />

      <div className="grid analytics-detail-grid">
        <div className="surface surface-subtle stack builder-subpanel analytics-detail-panel">
          <div>
            <span className="eyebrow">Readout</span>
            <h3 className="support-title">What changed after publish</h3>
            <p className="small muted support-copy">
              Use this panel after request proof to translate cache behavior into origin offload and quota impact.
            </p>
          </div>
          <CacheValueCard bytes={summary.cacheValueBytes} />
        </div>

        <div className="surface surface-subtle stack builder-subpanel analytics-detail-panel">
          <div>
            <span className="eyebrow">Quota watch</span>
            <h3 className="support-title">Bandwidth contract</h3>
            <p className="small muted support-copy">
              Usage is counted on the live request path, so the quota state should match what operators and buyers just saw in proof.
            </p>
          </div>
          <QuotaStatusCard
            usedBytes={summary.quotaUsedBytes}
            limitBytes={summary.quotaLimitBytes}
            reached={summary.quotaReached}
          />
        </div>
      </div>
    </div>
  )
}
