package state

type DomainStatus string

const (
	DomainPending DomainStatus = "pending"
	DomainReady   DomainStatus = "ready"
)

type PolicyRevision struct {
	ID           string `json:"id"`
	CacheEnabled bool   `json:"cacheEnabled"`
	Label        string `json:"label"`
	CreatedAt    string `json:"createdAt"`
}

type DNSRecord struct {
	Host    string `json:"host"`
	Type    string `json:"type"`
	Value   string `json:"value"`
	Purpose string `json:"purpose"`
	TTL     int    `json:"ttl"`
	Proxied bool   `json:"proxied"`
}

type DomainRecord struct {
	ID              string           `json:"id"`
	Hostname        string           `json:"hostname"`
	Origin          string           `json:"origin"`
	Status          DomainStatus     `json:"status"`
	ReadinessNote   string           `json:"readinessNote"`
	TruthLabel      string           `json:"truthLabel"`
	ActiveRevision  string           `json:"activeRevisionId"`
	AppliedRevision string           `json:"appliedRevisionId"`
	Revisions       []PolicyRevision `json:"revisions"`
	DNSRecords      []DNSRecord      `json:"dnsRecords"`
	ProxyMode       string           `json:"proxyMode"`
	RouteHint       string           `json:"routeHint"`
	RateLimit       int              `json:"rateLimit"`
}

type RequestProof struct {
	RequestID        string `json:"requestId"`
	TraceID          string `json:"traceId"`
	DomainID         string `json:"domainId"`
	Hostname         string `json:"hostname"`
	Path             string `json:"path"`
	Timestamp        string `json:"timestamp"`
	RevisionID       string `json:"revisionId"`
	CacheStatus      string `json:"cacheStatus"`
	FinalDisposition string `json:"finalDisposition"`
	BytesServed      int    `json:"bytesServed"`
	QuotaUsedBytes   int    `json:"quotaUsedBytes"`
	QuotaLimitBytes  int    `json:"quotaLimitBytes"`
	Message          string `json:"message"`
}

type ServiceLog struct {
	ID        string `json:"id"`
	Service   string `json:"service"`
	Level     string `json:"level"`
	RequestID string `json:"requestId"`
	TraceID   string `json:"traceId"`
	DomainID  string `json:"domainId"`
	Revision  string `json:"revisionId"`
	Event     string `json:"event"`
	Outcome   string `json:"outcome"`
	Message   string `json:"message"`
	Timestamp string `json:"timestamp"`
}

type AnalyticsSummary struct {
	TotalRequests   int     `json:"totalRequests"`
	ServedRequests  int     `json:"servedRequests"`
	BlockedRequests int     `json:"blockedRequests"`
	BandwidthBytes  int     `json:"bandwidthBytes"`
	CacheHits       int     `json:"cacheHits"`
	CacheMisses     int     `json:"cacheMisses"`
	CacheBypass     int     `json:"cacheBypass"`
	HitRatio        float64 `json:"hitRatio"`
	CacheValueBytes int     `json:"cacheValueBytes"`
	QuotaUsedBytes  int     `json:"quotaUsedBytes"`
	QuotaLimitBytes int     `json:"quotaLimitBytes"`
	QuotaReached    bool    `json:"quotaReached"`
	Freshness       string  `json:"freshness"`
}

type QuotaState struct {
	UsedBytes      int     `json:"usedBytes"`
	LimitBytes     int     `json:"limitBytes"`
	Reached        bool    `json:"reached"`
	RemainingBytes int     `json:"remainingBytes"`
	PercentUsed    float64 `json:"percentUsed"`
}

type DashboardSnapshot struct {
	Domains   []DomainRecord   `json:"domains"`
	Events    []RequestProof   `json:"events"`
	Analytics AnalyticsSummary `json:"analytics"`
	Quota     QuotaState       `json:"quota"`
}

type EdgeContext struct {
	Domain          DomainRecord `json:"domain"`
	QuotaUsedBytes  int          `json:"quotaUsedBytes"`
	QuotaLimitBytes int          `json:"quotaLimitBytes"`
	RateLimitWindow int          `json:"rateLimitWindow"`
}

type EdgeIngestPayload struct {
	Proof   RequestProof `json:"proof"`
	EdgeLog ServiceLog   `json:"edgeLog"`
}
