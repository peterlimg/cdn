package state

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"cdn-demo/api-go/internal/db"
	"cdn-demo/api-go/internal/domains"
	"cdn-demo/api-go/internal/policy"
)

const quotaLimitBytes = 150000

type Store struct {
	mu         sync.Mutex
	db         *db.Client
	domains    map[string]DomainRecord
	events     []RequestProof
	logs       []ServiceLog
	nextDomain int
	nextLog    int
}

func NewStore(client *db.Client) *Store {
	store := &Store{db: client, domains: map[string]DomainRecord{}}
	store.loadPersistedState()
	return store
}

func (s *Store) Reset() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.db != nil {
		if err := s.db.Reset(); err != nil {
			log.Printf("control-plane reset did not fully clear postgres state: %v", err)
		}
	}
	s.domains = map[string]DomainRecord{}
	s.events = nil
	s.logs = nil
	s.nextDomain = 0
	s.nextLog = 0
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

func buildDomain(id, hostname, mode string) DomainRecord {
	baseline := baselineRevision()
	ready := mode == string(DomainReady)
	return DomainRecord{
		ID:              id,
		Hostname:        hostname,
		Origin:          "demo-origin.internal",
		Status:          DomainStatus(mode),
		ReadinessNote:   map[bool]string{true: "Pre-verified demo domain ready for live traffic proof.", false: "Onboarding records are configured but live traffic stays blocked in pending mode."}[ready],
		TruthLabel:      map[bool]string{true: "live-proof", false: "seeded-demo-data"}[ready],
		ActiveRevision:  baseline.ID,
		AppliedRevision: baseline.ID,
		Revisions:       []PolicyRevision{baseline},
		DNSRecords:      buildDNSRecords(hostname),
		ProxyMode:       "proxied",
		RouteHint:       "/assets/demo.css",
		RateLimit:       3,
	}
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
		if domain.RateLimit == 0 {
			domain.RateLimit = 3
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
	return fmt.Sprintf("log-%06d", s.nextLog)
}

func (s *Store) CreateDomain(hostname string, mode string) DomainRecord {
	s.mu.Lock()
	defer s.mu.Unlock()
	domain := buildDomain(s.nextDomainID(), hostname, mode)
	s.domains[domain.ID] = domain
	s.persistDomainLocked(domain)
	s.appendLogLocked(ServiceLog{Service: "api", Level: "INFO", RequestID: "domain-create", TraceID: domain.ID, DomainID: domain.ID, Revision: domain.ActiveRevision, Event: "domain.create", Outcome: "stored", Message: "Domain created in Go control service.", Timestamp: now()})
	return domain
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
	s.appendLogLocked(ServiceLog{Service: "api", Level: "INFO", RequestID: "policy-publish", TraceID: domainID, DomainID: domainID, Revision: revision.ID, Event: "policy.publish", Outcome: "applied", Message: revision.Label, Timestamp: now()})
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
	s.appendLogLocked(ServiceLog{Service: "api", Level: "INFO", RequestID: "policy-rollback", TraceID: domainID, DomainID: domainID, Revision: target.ID, Event: "policy.rollback", Outcome: "baseline", Message: "Returned policy to baseline revision.", Timestamp: now()})
	return target, true
}

func (s *Store) EdgeContext(domainID string) (EdgeContext, bool) {
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
	s.appendLogLocked(ServiceLog{Service: "api", Level: "INFO", RequestID: "config-lookup", TraceID: domainID, DomainID: domainID, Revision: domain.ActiveRevision, Event: "config.lookup", Outcome: "served", Message: "Served edge context to Rust edge service.", Timestamp: now()})
	return EdgeContext{Domain: domain, QuotaUsedBytes: quotaUsed, QuotaLimitBytes: quotaLimitBytes, RateLimitWindow: 60}, true
}

func (s *Store) IngestEdgeEvent(payload EdgeIngestPayload) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.events = append([]RequestProof{payload.Proof}, s.events...)
	s.persistEventLocked(payload.Proof)
	payload.EdgeLog.ID = s.nextLogID()
	s.logs = append([]ServiceLog{payload.EdgeLog}, s.logs...)
	s.persistLogLocked(payload.EdgeLog)
	s.appendLogLocked(ServiceLog{Service: "api", Level: "INFO", RequestID: payload.Proof.RequestID, TraceID: payload.Proof.TraceID, DomainID: payload.Proof.DomainID, Revision: payload.Proof.RevisionID, Event: "edge.ingest", Outcome: payload.Proof.FinalDisposition, Message: "Ingested edge proof into Go analytics state.", Timestamp: now()})
}

func (s *Store) appendLogLocked(log ServiceLog) {
	log.ID = s.nextLogID()
	s.logs = append([]ServiceLog{log}, s.logs...)
	s.persistLogLocked(log)
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

func (s *Store) persistEventLocked(event RequestProof) {
	if s.db == nil {
		return
	}
	payload, err := json.Marshal(event)
	if err != nil {
		log.Printf("control-plane event encode failed: %v", err)
		return
	}
	if err := s.db.InsertEvent(event.RequestID, event.DomainID, db.ParseTimestamp(event.Timestamp), payload); err != nil {
		log.Printf("control-plane event persist failed: %v", err)
	}
}

func (s *Store) persistLogLocked(entry ServiceLog) {
	if s.db == nil {
		return
	}
	payload, err := json.Marshal(entry)
	if err != nil {
		log.Printf("control-plane log encode failed: %v", err)
		return
	}
	if err := s.db.InsertLog(entry.ID, entry.DomainID, entry.Service, db.ParseTimestamp(entry.Timestamp), payload); err != nil {
		log.Printf("control-plane log persist failed: %v", err)
	}
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
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.analyticsLocked(domainID)
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
	return DashboardSnapshot{Domains: domains, Events: s.Events(domainID), Analytics: s.Analytics(domainID), Quota: s.Quota(domainID)}
}
