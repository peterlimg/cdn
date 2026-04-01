package state

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	analyticsstore "cdn-demo/api-go/internal/analytics"
	"cdn-demo/api-go/internal/db"
	"cdn-demo/api-go/internal/domains"
	"cdn-demo/api-go/internal/policy"
)

const quotaLimitBytes = 150000
const defaultRateLimit = 10
const minimumQuotaSafeRateLimit = 6

type Store struct {
	mu                 sync.Mutex
	db                 *db.Client
	analytics          analyticsClient
	analyticsFreshness string
	analyticsFailure   string
	domains            map[string]DomainRecord
	events             []RequestProof
	logs               []ServiceLog
	nextDomain         int
	nextLog            int
}

type analyticsClient interface {
	Enabled() bool
	Healthy(ctx context.Context) error
	InsertRequestEvent(ctx context.Context, event analyticsstore.Event) error
	Reset(ctx context.Context) error
	QuerySummary(ctx context.Context, domainID string, quotaLimitBytes int) (analyticsstore.Summary, error)
}

var ErrAnalyticsReset = errors.New("clickhouse reset failed")

const (
	analyticsFailureNone   = ""
	analyticsFailureIngest = "ingest"
	analyticsFailureQuery  = "query"
)

func NewStore(client *db.Client, analytics analyticsClient) *Store {
	store := &Store{db: client, analytics: analytics, analyticsFreshness: "live", analyticsFailure: analyticsFailureNone, domains: map[string]DomainRecord{}}
	store.loadPersistedState()
	return store
}

func (s *Store) Reset() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.analytics != nil && s.analytics.Enabled() {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if err := s.analytics.Reset(ctx); err != nil {
			return fmt.Errorf("%w: %v", ErrAnalyticsReset, err)
		}
	}
	if s.db != nil {
		if err := s.db.Reset(); err != nil {
			return err
		}
	}
	s.domains = map[string]DomainRecord{}
	s.events = nil
	s.logs = nil
	s.nextDomain = 0
	s.nextLog = 0
	s.analyticsFreshness = "live"
	s.analyticsFailure = analyticsFailureNone
	return nil
}

func (s *Store) Healthy(ctx context.Context) error {
	if s.db == nil {
		return nil
	}
	return s.db.Ping(ctx)
}

func (s *Store) AnalyticsHealthy(ctx context.Context) error {
	if s.analytics == nil || !s.analytics.Enabled() {
		return nil
	}
	return s.analytics.Healthy(ctx)
}

func (s *Store) AnalyticsWarning() string {
	if s.analyticsFreshness != "degraded" {
		return ""
	}
	switch s.analyticsFailure {
	case analyticsFailureIngest:
		return "clickhouse analytics are in guarded fallback after an earlier ingest failure; reset or reseed restores a trusted baseline"
	case analyticsFailureQuery:
		return "clickhouse summary queries are degraded, falling back to local events"
	default:
		return "analytics are degraded and falling back to local events"
	}
}

func now() string {
	return time.Now().UTC().Format(time.RFC3339)
}

func baselineRevision() PolicyRevision {
	return PolicyRevision{
		ID:           policy.RevisionID(1),
		CacheEnabled: false,
		Label:        policy.RevisionLabel(false),
		CreatedAt:    now(),
	}
}

func buildDNSRecords(hostname string) []DNSRecord {
	return []DNSRecord{
		{Host: hostname, Type: "CNAME", Value: "edge.northstar-demo.internal", Purpose: "Proxy traffic through Rust edge", TTL: 60, Proxied: true},
		{Host: "_verify." + hostname, Type: "TXT", Value: "northstar-demo-verification", Purpose: "Demo verification record", TTL: 60, Proxied: false},
	}
}

func validateOrigin(origin string, setupPath string) (string, string) {
	trimmed := strings.TrimSpace(origin)
	if trimmed == "" {
		return "failed", "Enter an origin URL before continuing setup."
	}

	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "failed", "Origin must be a valid absolute URL."
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "failed", "Origin must use http or https."
	}

	host := parsed.Hostname()
	if host == "" {
		return "failed", "Origin host is required."
	}
	if setupPath != "demo-static" && setupPath != "network-static" {
		if strings.EqualFold(host, "localhost") {
			return "failed", "Localhost origins are only allowed for the demo static path."
		}
		ip := net.ParseIP(host)
		if ip != nil {
			if ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified() {
				return "failed", "Private-network origins are only allowed for the demo static path."
			}
		}
	}

	return "healthy", "Origin format looks valid for CDN routing."
}

func defaultHealthCheckPath(setupPath string) string {
	if setupPath == "existing-origin" {
		return "/"
	}
	return "/assets/demo.css"
}

func normalizeHealthCheckPath(path string, setupPath string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return defaultHealthCheckPath(setupPath)
	}
	if !strings.HasPrefix(trimmed, "/") {
		return "/" + trimmed
	}
	return trimmed
}

func probeOrigin(origin string, healthCheckPath string) (string, string) {
	client := &http.Client{Timeout: 2 * time.Second}
	probePath := normalizeHealthCheckPath(healthCheckPath, "existing-origin")
	probeURL := strings.TrimRight(origin, "/") + probePath
	request, err := http.NewRequest(http.MethodGet, probeURL, nil)
	if err != nil {
		return "failed", "Origin health check could not be prepared."
	}
	request.Header.Set("X-Request-Id", "origin-health-check")

	response, err := client.Do(request)
	if err != nil {
		return "failed", "Origin did not respond to the health check path."
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return "failed", fmt.Sprintf("Origin health check returned HTTP %d.", response.StatusCode)
	}

	return "healthy", fmt.Sprintf("Origin responded successfully on %s with HTTP %d.", probePath, response.StatusCode)
}

func applySetupState(domain DomainRecord, validationMode string, shouldProbe bool, recordCheck bool) DomainRecord {
	originStatus, originMessage := validateOrigin(domain.Origin, domain.SetupPath)
	if originStatus == "healthy" && shouldProbe {
		originStatus, originMessage = probeOrigin(domain.Origin, domain.HealthCheckPath)
	}
	domain.OriginStatus = originStatus
	domain.OriginValidationMessage = originMessage
	if recordCheck {
		domain.LastOriginCheckAt = now()
		domain.LastOriginCheckOutcome = originStatus
	}

	if originStatus == "failed" {
		domain.Status = DomainPending
		domain.DNSStatus = "pending"
		domain.SetupStage = "created"
		domain.ReadinessNote = originMessage
		domain.TruthLabel = "roadmap-shape"
		return domain
	}

	if domain.DNSStatus == "verified" && validationMode == string(DomainReady) {
		domain.Status = DomainReady
		domain.SetupStage = "ready"
		domain.ReadinessNote = "Origin, DNS, and activation state are aligned for live request proof."
		domain.TruthLabel = "live-proof"
		return domain
	}

	domain.Status = DomainPending
	domain.DNSStatus = "pending"
	domain.SetupStage = "origin-configured"
	domain.ReadinessNote = "Origin is configured, but DNS verification is still required before live traffic can reach the edge."
	domain.TruthLabel = "seeded-demo-data"
	return domain
}

type CreateDomainInput struct {
	Hostname        string
	Mode            string
	ProjectName     string
	Origin          string
	HealthCheckPath string
	SetupPath       string
}

type UpdateDomainSetupInput struct {
	ProjectName     string
	Origin          string
	HealthCheckPath string
	SetupPath       string
}

func buildDomain(id string, input CreateDomainInput) DomainRecord {
	baseline := baselineRevision()
	origin := input.Origin
	if origin == "" {
		origin = demoOriginURL()
	}
	setupPath := input.SetupPath
	if setupPath == "" {
		setupPath = "demo-static"
	}
	healthCheckPath := normalizeHealthCheckPath(input.HealthCheckPath, setupPath)
	dnsStatus := "pending"
	if input.Mode == string(DomainReady) {
		dnsStatus = "verified"
	}
	domain := DomainRecord{
		ID:              id,
		Hostname:        input.Hostname,
		ProjectName:     input.ProjectName,
		Origin:          origin,
		HealthCheckPath: healthCheckPath,
		SetupPath:       setupPath,
		DNSStatus:       dnsStatus,
		ActiveRevision:  baseline.ID,
		AppliedRevision: baseline.ID,
		Revisions:       []PolicyRevision{baseline},
		DNSRecords:      buildDNSRecords(input.Hostname),
		ProxyMode:       "proxied",
		RouteHint:       healthCheckPath,
		RateLimit:       defaultRateLimit,
	}
	shouldProbe := input.Origin != ""
	return applySetupState(domain, input.Mode, shouldProbe, shouldProbe)
}

func demoOriginURL() string {
	if value := os.Getenv("DEMO_ORIGIN_URL"); value != "" {
		return value
	}
	return "http://127.0.0.1:3000/origin"
}

func traceIDOrDomain(traceID, domainID string) string {
	if traceID != "" {
		return traceID
	}
	return domainID
}

func (s *Store) loadPersistedState() {
	if s.db == nil {
		return
	}

	domainsPayload, err := s.db.LoadDomains()
	if err != nil {
		log.Printf("control-plane postgres load domains failed: %v", err)
		return
	}
	for _, payload := range domainsPayload {
		var domain DomainRecord
		if err := json.Unmarshal(payload, &domain); err != nil {
			log.Printf("control-plane postgres domain decode failed: %v", err)
			continue
		}
		domain.HealthCheckPath = normalizeHealthCheckPath(domain.HealthCheckPath, domain.SetupPath)
		if domain.RouteHint == "" || (domain.SetupPath == "existing-origin" && domain.RouteHint == "/assets/demo.css") {
			domain.RouteHint = domain.HealthCheckPath
		}
		if domain.RateLimit < minimumQuotaSafeRateLimit {
			domain.RateLimit = defaultRateLimit
		}
		s.domains[domain.ID] = domain
		if seq := domains.ParseDomainSequence(domain.ID); seq > s.nextDomain {
			s.nextDomain = seq
		}
	}

	eventsPayload, err := s.db.LoadEvents()
	if err != nil {
		log.Printf("control-plane postgres load events failed: %v", err)
		return
	}
	for _, payload := range eventsPayload {
		var event RequestProof
		if err := json.Unmarshal(payload, &event); err != nil {
			log.Printf("control-plane postgres event decode failed: %v", err)
			continue
		}
		s.events = append(s.events, event)
	}

	logsPayload, err := s.db.LoadLogs()
	if err != nil {
		log.Printf("control-plane postgres load logs failed: %v", err)
		return
	}
	for _, payload := range logsPayload {
		var entry ServiceLog
		if err := json.Unmarshal(payload, &entry); err != nil {
			log.Printf("control-plane postgres log decode failed: %v", err)
			continue
		}
		s.logs = append(s.logs, entry)
		var seq int
		_, _ = fmt.Sscanf(entry.ID, "log-%d", &seq)
		if seq > s.nextLog {
			s.nextLog = seq
		}
	}
}

func (s *Store) nextDomainID() string {
	s.nextDomain++
	return fmt.Sprintf("zone-%06d", s.nextDomain)
}

func (s *Store) nextLogID() string {
	s.nextLog++
	return formatLogID(s.nextLog)
}

func formatLogID(sequence int) string {
	return fmt.Sprintf("log-%06d", sequence)
}

func canonicalHostname(hostname string) string {
	return strings.ToLower(strings.TrimSpace(hostname))
}

func (s *Store) CreateDomain(input CreateDomainInput) (DomainRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	hostname := canonicalHostname(input.Hostname)
	for _, existing := range s.domains {
		if canonicalHostname(existing.Hostname) == hostname {
			return DomainRecord{}, fmt.Errorf("hostname already exists")
		}
	}
	input.Hostname = hostname
	domain := buildDomain(s.nextDomainID(), input)
	s.domains[domain.ID] = domain
	s.persistDomainLocked(domain)
	if err := s.appendLogLocked(ServiceLog{Service: "api", Level: "INFO", RequestID: "domain-create", TraceID: domain.ID, DomainID: domain.ID, Revision: domain.ActiveRevision, Event: "domain.create", Outcome: "stored", Message: "Domain created in Go control service.", Timestamp: now()}); err != nil {
		log.Printf("control-plane log persist failed: %v", err)
	}
	return domain, nil
}

func (s *Store) UpdateDomainSetup(domainID string, input UpdateDomainSetupInput) (DomainRecord, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	domain, ok := s.domains[domainID]
	if !ok {
		return DomainRecord{}, false
	}

	if input.ProjectName != "" {
		domain.ProjectName = input.ProjectName
	}
	if input.Origin != "" {
		domain.Origin = input.Origin
	}
	if input.HealthCheckPath != "" {
		domain.HealthCheckPath = normalizeHealthCheckPath(input.HealthCheckPath, domain.SetupPath)
		domain.RouteHint = domain.HealthCheckPath
	}
	if input.SetupPath != "" {
		domain.SetupPath = input.SetupPath
		if input.HealthCheckPath == "" {
			domain.HealthCheckPath = normalizeHealthCheckPath(domain.HealthCheckPath, domain.SetupPath)
			domain.RouteHint = domain.HealthCheckPath
		}
	}

	validationMode := string(domain.Status)
	if domain.DNSStatus == "verified" {
		validationMode = string(DomainReady)
	}
	domain = applySetupState(domain, validationMode, true, true)

	s.domains[domainID] = domain
	s.persistDomainLocked(domain)
	if err := s.appendLogLocked(ServiceLog{Service: "api", Level: "INFO", RequestID: "domain-setup-update", TraceID: domainID, DomainID: domainID, Revision: domain.ActiveRevision, Event: "domain.setup.update", Outcome: "stored", Message: "Updated site setup details in Go control service.", Timestamp: now()}); err != nil {
		log.Printf("control-plane log persist failed: %v", err)
	}
	return domain, true
}

func (s *Store) VerifyDomainDNS(domainID string) (DomainRecord, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	domain, ok := s.domains[domainID]
	if !ok {
		return DomainRecord{}, false
	}

	if domain.OriginStatus != "healthy" {
		if domain.OriginValidationMessage == "" {
			domain.OriginValidationMessage = "Origin validation must succeed before DNS can be marked verified."
		}
		s.domains[domainID] = domain
		return domain, true
	}

	domain.DNSStatus = "verified"
	domain = applySetupState(domain, string(DomainReady), true, false)

	s.domains[domainID] = domain
	s.persistDomainLocked(domain)
	if err := s.appendLogLocked(ServiceLog{Service: "api", Level: "INFO", RequestID: "domain-dns-verify", TraceID: domainID, DomainID: domainID, Revision: domain.ActiveRevision, Event: "domain.dns.verify", Outcome: "verified", Message: "Marked DNS setup as verified for this site.", Timestamp: now()}); err != nil {
		log.Printf("control-plane log persist failed: %v", err)
	}
	return domain, true
}

func (s *Store) RecheckOrigin(domainID string) (DomainRecord, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	domain, ok := s.domains[domainID]
	if !ok {
		return DomainRecord{}, false
	}

	validationMode := string(domain.Status)
	if domain.DNSStatus == "verified" {
		validationMode = string(DomainReady)
	}
	domain = applySetupState(domain, validationMode, true, true)

	s.domains[domainID] = domain
	s.persistDomainLocked(domain)
	if err := s.appendLogLocked(ServiceLog{Service: "api", Level: "INFO", RequestID: "domain-origin-recheck", TraceID: domainID, DomainID: domainID, Revision: domain.ActiveRevision, Event: "domain.origin.recheck", Outcome: domain.OriginStatus, Message: domain.OriginValidationMessage, Timestamp: now()}); err != nil {
		log.Printf("control-plane log persist failed: %v", err)
	}
	return domain, true
}

func (s *Store) ListDomains() []DomainRecord {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := make([]DomainRecord, 0, len(s.domains))
	for _, domain := range s.domains {
		items = append(items, domain)
	}
	return items
}

func (s *Store) GetDomain(id string) (DomainRecord, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	domain, ok := s.domains[id]
	return domain, ok
}

func (s *Store) GetDomainByHostname(hostname string) (DomainRecord, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var matched *DomainRecord
	target := canonicalHostname(hostname)
	for _, domain := range s.domains {
		if canonicalHostname(domain.Hostname) == target {
			if matched != nil {
				return DomainRecord{}, false, fmt.Errorf("multiple domains found for hostname")
			}
			copy := domain
			matched = &copy
		}
	}
	if matched == nil {
		return DomainRecord{}, false, nil
	}
	return *matched, true, nil
}

func (s *Store) RecordServiceLog(entry ServiceLog) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.appendLogLocked(entry); err != nil {
		log.Printf("control-plane log persist failed: %v", err)
	}
}

func (s *Store) PublishPolicy(domainID string, cacheEnabled bool) (PolicyRevision, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	domain, ok := s.domains[domainID]
	if !ok {
		return PolicyRevision{}, false
	}
	revision := PolicyRevision{
		ID:           policy.RevisionID(len(domain.Revisions) + 1),
		CacheEnabled: cacheEnabled,
		Label:        policy.RevisionLabel(cacheEnabled),
		CreatedAt:    now(),
	}
	domain.ActiveRevision = revision.ID
	domain.AppliedRevision = revision.ID
	domain.Revisions = append(domain.Revisions, revision)
	s.domains[domainID] = domain
	s.persistDomainLocked(domain)
	if err := s.appendLogLocked(ServiceLog{Service: "api", Level: "INFO", RequestID: "policy-publish", TraceID: domainID, DomainID: domainID, Revision: revision.ID, Event: "policy.publish", Outcome: "applied", Message: revision.Label, Timestamp: now()}); err != nil {
		log.Printf("control-plane log persist failed: %v", err)
	}
	return revision, true
}

func (s *Store) RollbackPolicy(domainID string) (PolicyRevision, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	domain, ok := s.domains[domainID]
	if !ok {
		return PolicyRevision{}, false
	}
	target := domain.Revisions[0]
	for _, revision := range domain.Revisions {
		if !revision.CacheEnabled {
			target = revision
			break
		}
	}
	domain.ActiveRevision = target.ID
	domain.AppliedRevision = target.ID
	s.domains[domainID] = domain
	s.persistDomainLocked(domain)
	if err := s.appendLogLocked(ServiceLog{Service: "api", Level: "INFO", RequestID: "policy-rollback", TraceID: domainID, DomainID: domainID, Revision: target.ID, Event: "policy.rollback", Outcome: "baseline", Message: "Returned policy to baseline revision.", Timestamp: now()}); err != nil {
		log.Printf("control-plane log persist failed: %v", err)
	}
	return target, true
}

func (s *Store) EdgeContext(domainID, requestID, traceID string) (EdgeContext, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	domain, ok := s.domains[domainID]
	if !ok {
		return EdgeContext{}, false
	}
	quotaUsed := 0
	for _, event := range s.events {
		if event.DomainID == domainID && event.FinalDisposition == "served" {
			quotaUsed += event.BytesServed
		}
	}
	if requestID == "" {
		requestID = "config-lookup"
	}
	if err := s.appendLogLocked(ServiceLog{Service: "api", Level: "INFO", RequestID: requestID, TraceID: traceIDOrDomain(traceID, domainID), DomainID: domainID, Revision: domain.ActiveRevision, Event: "config.lookup", Outcome: "served", Message: "Served edge context to Rust edge service.", Timestamp: now()}); err != nil {
		log.Printf("control-plane log persist failed: %v", err)
	}
	return EdgeContext{Domain: domain, QuotaUsedBytes: quotaUsed, QuotaLimitBytes: quotaLimitBytes, RateLimitWindow: 60}, true
}

func (s *Store) IngestEdgeEvent(payload EdgeIngestPayload) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	edgeLog := payload.EdgeLog
	edgeLog.ID = fmt.Sprintf("log-edge-%s", payload.Proof.RequestID)
	apiLog := ServiceLog{Service: "api", Level: "INFO", RequestID: payload.Proof.RequestID, TraceID: payload.Proof.TraceID, DomainID: payload.Proof.DomainID, Revision: payload.Proof.RevisionID, Event: "edge.ingest", Outcome: payload.Proof.FinalDisposition, Message: "Ingested edge proof into Go analytics state.", Timestamp: now()}
	apiLog.ID = fmt.Sprintf("log-api-ingest-%s", payload.Proof.RequestID)

	if err := s.persistEventLocked(payload.Proof); err != nil {
		return err
	}
	if s.analytics != nil && s.analytics.Enabled() {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		event := analyticsstore.Event{
			RequestID:        payload.Proof.RequestID,
			TraceID:          payload.Proof.TraceID,
			DomainID:         payload.Proof.DomainID,
			Hostname:         payload.Proof.Hostname,
			Path:             payload.Proof.Path,
			RevisionID:       payload.Proof.RevisionID,
			CacheStatus:      payload.Proof.CacheStatus,
			FinalDisposition: payload.Proof.FinalDisposition,
			BytesServed:      payload.Proof.BytesServed,
			QuotaUsedBytes:   payload.Proof.QuotaUsedBytes,
			QuotaLimitBytes:  payload.Proof.QuotaLimitBytes,
			Message:          payload.Proof.Message,
			Timestamp:        payload.Proof.Timestamp,
		}
		if err := s.analytics.InsertRequestEvent(ctx, event); err != nil {
			log.Printf("clickhouse analytics ingest failed: %v", err)
			s.analyticsFreshness = "degraded"
			s.analyticsFailure = analyticsFailureIngest
		} else if s.analyticsFreshness != "degraded" {
			s.analyticsFreshness = "live"
			s.analyticsFailure = analyticsFailureNone
		}
	}
	if err := s.persistLogLocked(edgeLog); err != nil {
		return err
	}
	if err := s.persistLogLocked(apiLog); err != nil {
		return err
	}

	s.events = append([]RequestProof{payload.Proof}, s.events...)
	s.logs = append([]ServiceLog{apiLog, edgeLog}, s.logs...)
	return nil
}

func (s *Store) appendLogLocked(log ServiceLog) error {
	log.ID = formatLogID(s.nextLog + 1)
	if err := s.persistLogLocked(log); err != nil {
		return err
	}
	s.nextLog++
	s.logs = append([]ServiceLog{log}, s.logs...)
	return nil
}

func (s *Store) persistDomainLocked(domain DomainRecord) {
	if s.db == nil {
		return
	}
	payload, err := json.Marshal(domain)
	if err != nil {
		log.Printf("control-plane domain encode failed: %v", err)
		return
	}
	if err := s.db.UpsertDomain(domain.ID, domain.Hostname, string(domain.Status), domain.ActiveRevision, payload); err != nil {
		log.Printf("control-plane domain persist failed: %v", err)
	}
}

func (s *Store) persistEventLocked(event RequestProof) error {
	if s.db == nil {
		return nil
	}
	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}
	if err := s.db.InsertEvent(event.RequestID, event.DomainID, db.ParseTimestamp(event.Timestamp), payload); err != nil {
		return err
	}
	return nil
}

func (s *Store) persistLogLocked(entry ServiceLog) error {
	if s.db == nil {
		return nil
	}
	payload, err := json.Marshal(entry)
	if err != nil {
		return err
	}
	if err := s.db.InsertLog(entry.ID, entry.DomainID, entry.Service, db.ParseTimestamp(entry.Timestamp), payload); err != nil {
		return err
	}
	return nil
}

func (s *Store) Logs(domainID, service, requestID string) []ServiceLog {
	s.mu.Lock()
	defer s.mu.Unlock()
	result := make([]ServiceLog, 0)
	for _, entry := range s.logs {
		if domainID != "" && entry.DomainID != domainID {
			continue
		}
		if service != "" && entry.Service != service {
			continue
		}
		if requestID != "" && entry.RequestID != requestID {
			continue
		}
		result = append(result, entry)
		if len(result) == 20 {
			break
		}
	}
	return result
}

func (s *Store) Analytics(domainID string) AnalyticsSummary {
	if s.analytics != nil && s.analytics.Enabled() {
		if s.analyticsFreshness == "degraded" && s.analyticsFailure == analyticsFailureIngest {
			s.mu.Lock()
			degraded := s.analyticsLocked(domainID)
			s.mu.Unlock()
			degraded.Freshness = analyticsFreshness("updating", s.analyticsFreshness)
			return degraded
		}
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		summary, err := s.analytics.QuerySummary(ctx, domainID, quotaLimitBytes)
		if err == nil {
			s.analyticsFreshness = "live"
			s.analyticsFailure = analyticsFailureNone
			return AnalyticsSummary{
				TotalRequests:   summary.TotalRequests,
				ServedRequests:  summary.ServedRequests,
				BlockedRequests: summary.BlockedRequests,
				BandwidthBytes:  summary.BandwidthBytes,
				CacheHits:       summary.CacheHits,
				CacheMisses:     summary.CacheMisses,
				CacheBypass:     summary.CacheBypass,
				HitRatio:        summary.HitRatio,
				CacheValueBytes: summary.CacheValueBytes,
				QuotaUsedBytes:  summary.QuotaUsedBytes,
				QuotaLimitBytes: summary.QuotaLimitBytes,
				QuotaReached:    summary.QuotaReached,
				Freshness:       analyticsFreshness(summary.Freshness, s.analyticsFreshness),
			}
		}
		log.Printf("clickhouse analytics query failed, falling back to postgres-backed events: %v", err)
		s.analyticsFreshness = "degraded"
		s.analyticsFailure = analyticsFailureQuery
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	summary := s.analyticsLocked(domainID)
	if s.analytics != nil && s.analytics.Enabled() {
		summary.Freshness = analyticsFreshness("updating", s.analyticsFreshness)
	}
	return summary
}

func analyticsFreshness(clickhouseFreshness, localFreshness string) string {
	if localFreshness == "degraded" {
		return "degraded"
	}
	return clickhouseFreshness
}

func (s *Store) analyticsLocked(domainID string) AnalyticsSummary {
	total := 0
	served := 0
	blocked := 0
	bandwidth := 0
	hits := 0
	misses := 0
	bypass := 0
	cacheValue := 0
	for _, event := range s.events {
		if domainID != "" && event.DomainID != domainID {
			continue
		}
		total++
		if event.FinalDisposition == "served" {
			served++
			bandwidth += event.BytesServed
		} else {
			blocked++
		}
		switch event.CacheStatus {
		case "HIT":
			hits++
			cacheValue += event.BytesServed
		case "MISS":
			misses++
		case "BYPASS":
			bypass++
		}
	}
	hitRatio := 0.0
	denominator := hits + misses + bypass
	if denominator > 0 {
		hitRatio = float64(hits) / float64(denominator)
	}
	return AnalyticsSummary{TotalRequests: total, ServedRequests: served, BlockedRequests: blocked, BandwidthBytes: bandwidth, CacheHits: hits, CacheMisses: misses, CacheBypass: bypass, HitRatio: hitRatio, CacheValueBytes: cacheValue, QuotaUsedBytes: bandwidth, QuotaLimitBytes: quotaLimitBytes, QuotaReached: bandwidth >= quotaLimitBytes, Freshness: "live"}
}

func (s *Store) Quota(domainID string) QuotaState {
	analytics := s.Analytics(domainID)
	remaining := analytics.QuotaLimitBytes - analytics.QuotaUsedBytes
	if remaining < 0 {
		remaining = 0
	}
	percent := (float64(analytics.QuotaUsedBytes) / float64(analytics.QuotaLimitBytes)) * 100
	if percent > 100 {
		percent = 100
	}
	return QuotaState{UsedBytes: analytics.QuotaUsedBytes, LimitBytes: analytics.QuotaLimitBytes, Reached: analytics.QuotaReached, RemainingBytes: remaining, PercentUsed: percent}
}

func (s *Store) Events(domainID string) []RequestProof {
	s.mu.Lock()
	defer s.mu.Unlock()
	result := make([]RequestProof, 0)
	for _, event := range s.events {
		if domainID != "" && event.DomainID != domainID {
			continue
		}
		result = append(result, event)
	}
	return result
}

func (s *Store) Dashboard(domainID string) DashboardSnapshot {
	domains := s.ListDomains()
	analytics := s.Analytics(domainID)
	remaining := analytics.QuotaLimitBytes - analytics.QuotaUsedBytes
	if remaining < 0 {
		remaining = 0
	}
	percent := (float64(analytics.QuotaUsedBytes) / float64(analytics.QuotaLimitBytes)) * 100
	if percent > 100 {
		percent = 100
	}
	quota := QuotaState{UsedBytes: analytics.QuotaUsedBytes, LimitBytes: analytics.QuotaLimitBytes, Reached: analytics.QuotaReached, RemainingBytes: remaining, PercentUsed: percent}
	return DashboardSnapshot{Domains: domains, Events: s.Events(domainID), Analytics: analytics, Quota: quota}
}
