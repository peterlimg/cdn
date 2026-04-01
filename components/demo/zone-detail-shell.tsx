"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { AnalyticsPageShell } from "./analytics-page-shell"
import { CachePolicyCard } from "./cache-policy-card"
import { DomainConfigSections } from "./domain-config-sections"
import { DomainOnboardingCard } from "./domain-onboarding-card"
import { EvidenceTabs } from "./evidence-tabs"
import { PolicyRevisionBanner } from "./policy-revision-banner"
import type { AnalyticsSummary, DomainRecord, RequestProof, ServiceLog } from "../../services/shared/src/types"

type Props = {
  domain: DomainRecord
  summary: AnalyticsSummary
  events: RequestProof[]
  edgeLogs: ServiceLog[]
  apiLogs: ServiceLog[]
}

export function ZoneDetailShell({ domain, summary, events, edgeLogs, apiLogs }: Props) {
  const router = useRouter()
  const [liveSummary, setLiveSummary] = useState(summary)
  const activeRevision = domain.revisions.find((revision) => revision.id === domain.activeRevisionId)

  async function refreshAnalytics() {
    const response = await fetch(`/api/analytics?domainId=${domain.id}`, {
      method: "GET",
      cache: "no-store",
    })
    const data = (await response.json()) as { analytics: AnalyticsSummary }
    setLiveSummary(data.analytics)
  }

  async function refreshAfterPolicyChange() {
    router.refresh()
    await refreshAnalytics()
  }

  return (
    <div className="grid stack zone-detail-shell">
      <PolicyRevisionBanner
        activeRevisionId={domain.activeRevisionId}
        appliedRevisionId={domain.appliedRevisionId}
      />

      <div className="grid zone-detail-hero-grid">
        <DomainOnboardingCard domain={domain} />
        <CachePolicyCard
          domainId={domain.id}
          cacheEnabled={Boolean(activeRevision?.cacheEnabled)}
          revisionLabel={activeRevision?.label ?? "Unknown revision"}
          onChanged={refreshAfterPolicyChange}
        />
      </div>

      <div className="grid zone-detail-main-grid">
        <div className="stack zone-detail-primary">
          <DomainConfigSections
            domainId={domain.id}
            projectName={domain.projectName}
            origin={domain.origin}
            healthCheckPath={domain.healthCheckPath}
            setupPath={domain.setupPath}
            setupStage={domain.setupStage}
            originStatus={domain.originStatus}
            originValidationMessage={domain.originValidationMessage}
            lastOriginCheckAt={domain.lastOriginCheckAt}
            lastOriginCheckOutcome={domain.lastOriginCheckOutcome}
            dnsStatus={domain.dnsStatus}
            dnsRecords={domain.dnsRecords ?? []}
            proxyMode={domain.proxyMode}
            routeHint={domain.routeHint}
          />

          <EvidenceTabs
            domainId={domain.id}
            domainStatus={domain.status}
            routeHint={domain.routeHint || domain.healthCheckPath}
            initialProofs={events}
            initialEdgeLogs={edgeLogs}
            initialApiLogs={apiLogs}
            onRequestComplete={refreshAnalytics}
          />
        </div>

        <aside className="zone-detail-secondary">
          <div className="surface surface-subtle stack builder-subpanel zone-detail-analytics-panel">
            <div>
              <span className="eyebrow">Analytics confirm</span>
              <h3 className="support-title">Post-proof readout</h3>
            </div>
            <AnalyticsPageShell summary={liveSummary} />
          </div>
        </aside>
      </div>
    </div>
  )
}
