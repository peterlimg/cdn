export type DomainStatus = "pending" | "ready"

export type SetupPath = "existing-origin" | "network-static" | "demo-static"

export type SetupStage =
  | "created"
  | "origin-configured"
  | "dns-pending"
  | "verifying"
  | "ready"

export type OriginStatus = "pending" | "healthy" | "failed"

export type TruthLabel =
  | "live-proof"
  | "derived-with-lag"
  | "seeded-demo-data"
  | "roadmap-shape"

export type CacheStatus =
  | "BYPASS"
  | "MISS"
  | "HIT"
  | "BLOCKED_QUOTA"
  | "BLOCKED_PENDING"
  | "BLOCKED_WAF"
  | "BLOCKED_RATE_LIMIT"
  | "ORIGIN_ERROR"

export type ServiceName = "edge" | "api"

export type PolicyRevision = {
  id: string
  cacheEnabled: boolean
  label: string
  createdAt: string
}

export type DNSRecord = {
  host: string
  type: "CNAME" | "TXT"
  value: string
  purpose: string
  ttl: number
  proxied: boolean
}

export type DomainRecord = {
  id: string
  hostname: string
  projectName?: string
  origin: string
  healthCheckPath?: string
  originValidationMessage?: string
  lastOriginCheckAt?: string
  lastOriginCheckOutcome?: OriginStatus
  setupPath?: SetupPath
  setupStage?: SetupStage
  originStatus?: OriginStatus
  dnsStatus?: "pending" | "verified"
  status: DomainStatus
  readinessNote: string
  truthLabel: TruthLabel
  activeRevisionId: string
  appliedRevisionId: string
  revisions: PolicyRevision[]
  dnsRecords?: DNSRecord[]
  proxyMode?: "proxied" | "dns-only"
  routeHint?: string
  rateLimit?: number
}

export type RequestProof = {
  requestId: string
  traceId?: string
  domainId: string
  hostname: string
  path: string
  timestamp: string
  revisionId: string
  cacheStatus: CacheStatus
  finalDisposition: "served" | "blocked"
  bytesServed: number
  quotaUsedBytes: number
  quotaLimitBytes: number
  message: string
}

export type AnalyticsEvent = RequestProof

export type ServiceLog = {
  id: string
  service: ServiceName
  level: "INFO" | "WARN" | "ERROR"
  requestId: string
  traceId: string
  domainId: string
  revisionId: string
  event: string
  outcome: string
  message: string
  timestamp: string
}

export type AnalyticsSummary = {
  totalRequests: number
  servedRequests: number
  blockedRequests: number
  bandwidthBytes: number
  cacheHits: number
  cacheMisses: number
  cacheBypass: number
  hitRatio: number
  cacheValueBytes: number
  quotaUsedBytes: number
  quotaLimitBytes: number
  quotaReached: boolean
  freshness: "live" | "updating" | "degraded"
}

export type DashboardSnapshot = {
  domains: DomainRecord[]
  events: AnalyticsEvent[]
  analytics: AnalyticsSummary
  quota: {
    usedBytes: number
    limitBytes: number
    reached: boolean
    remainingBytes: number
    percentUsed: number
  }
}

export type DemoState = {
  domains: DomainRecord[]
  activeDomainId: string | null
  events: AnalyticsEvent[]
  cacheEntries: Record<string, { bytesServed: number; revisionId: string }>
  quotaLimitBytes: number
  quotaUsedBytes: number
  requestCounter: number
}
