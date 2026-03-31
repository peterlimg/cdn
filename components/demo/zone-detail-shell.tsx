"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { AnalyticsPageShell } from "./analytics-page-shell"
import { CachePolicyCard } from "./cache-policy-card"
import { DomainConfigSections } from "./domain-config-sections"
import { DomainOnboardingCard } from "./domain-onboarding-card"
import { DomainStateTimeline } from "./domain-state-timeline"
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
    <div className="grid stack">
      <PolicyRevisionBanner
        activeRevisionId={domain.activeRevisionId}
        appliedRevisionId={domain.appliedRevisionId}
      />

      <div className="grid two-col">
        <DomainOnboardingCard domain={domain} />
        <CachePolicyCard
          domainId={domain.id}
          cacheEnabled={Boolean(activeRevision?.cacheEnabled)}
          revisionLabel={activeRevision?.label ?? "Unknown revision"}
          onChanged={refreshAfterPolicyChange}
        />
      </div>

      <div className="grid two-col">
        <DomainConfigSections
          origin={domain.origin}
          dnsRecords={domain.dnsRecords ?? []}
          proxyMode={domain.proxyMode}
          routeHint={domain.routeHint}
        />
        <DomainStateTimeline status={domain.status} />
      </div>

      <div className="grid two-col">
        <EvidenceTabs
          domainId={domain.id}
          initialProofs={events}
          initialEdgeLogs={edgeLogs}
          initialApiLogs={apiLogs}
          onRequestComplete={refreshAnalytics}
        />
        <AnalyticsPageShell summary={liveSummary} />
      </div>
    </div>
  )
}
