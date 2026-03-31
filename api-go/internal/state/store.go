package state

import (
	"fmt"
	"sync"
	"time"
)

const quotaLimitBytes = 150000

type Store struct {
	mu         sync.Mutex
	domains    map[string]DomainRecord
	events     []RequestProof
	logs       []ServiceLog
	nextDomain int
	nextLog    int
}

func NewStore() *Store {
	return &Store{domains: map[string]DomainRecord{}}
}

func (s *Store) Reset() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.domains = map[string]DomainRecord{}
	s.events = nil
	s.logs = nil
	s.nextDomain = 0
	s.nextLog = 0
}

func now() string {
	return time.Now().UTC().Format(time.RFC3339)
}

func (s *Store) nextDomainID() string {
	s.nextDomain++
	return fmt.Sprintf("zone-%06d", s.nextDomain)
}

func (s *Store) nextLogID() string {
	s.nextLog++
	return fmt.Sprintf("log-%06d", s.nextLog)
}

func baselineRevision() PolicyRevision {
	return PolicyRevision{
		ID:           "rev-1",
		CacheEnabled: false,
		Label:        "Baseline - origin fetch only",
		CreatedAt:    now(),
	}
}

func buildDNSRecords(hostname string) []DNSRecord {
	return []DNSRecord{
		{Host: hostname, Type: "CNAME", Value: "edge.northstar-demo.internal", Purpose: "Proxy traffic through Rust edge", TTL: 60, Proxied: true},
		{Host: "_verify." + hostname, Type: "TXT", Value: "northstar-demo-verification", Purpose: "Demo verification record", TTL: 60, Proxied: false},
	}
}

func (s *Store) CreateDomain(hostname string, mode string) DomainRecord {
	s.mu.Lock()
	defer s.mu.Unlock()
	baseline := baselineRevision()
	domain := DomainRecord{
		ID:              s.nextDomainID(),
		Hostname:        hostname,
		Origin:          "demo-origin.internal",
		Status:          DomainStatus(mode),
		ReadinessNote:   map[bool]string{true: "Pre-verified demo domain ready for live traffic proof.", false: "Onboarding records are configured but live traffic stays blocked in pending mode."}[mode == string(DomainReady)],
		TruthLabel:      map[bool]string{true: "live-proof", false: "seeded-demo-data"}[mode == string(DomainReady)],
		ActiveRevision:  baseline.ID,
		AppliedRevision: baseline.ID,
		Revisions:       []PolicyRevision{baseline},
		DNSRecords:      buildDNSRecords(hostname),
		ProxyMode:       "proxied",
		RouteHint:       "/assets/demo.css",
	}
	s.domains[domain.ID] = domain
	s.appendLogLocked(ServiceLog{Service: "api", Level: "INFO", RequestID: "domain-create", TraceID: domain.ID, DomainID: domain.ID, Revision: baseline.ID, Event: "domain.create", Outcome: "stored", Message: "Domain created in Go control service.", Timestamp: now()})
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
		ID:           fmt.Sprintf("rev-%d", len(domain.Revisions)+1),
		CacheEnabled: cacheEnabled,
		Label:        map[bool]string{true: "Edge cache enabled for /assets/demo.css", false: "Baseline - origin fetch only"}[cacheEnabled],
		CreatedAt:    now(),
	}
	domain.ActiveRevision = revision.ID
	domain.AppliedRevision = revision.ID
	domain.Revisions = append(domain.Revisions, revision)
	s.domains[domainID] = domain
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
	return EdgeContext{Domain: domain, QuotaUsedBytes: quotaUsed, QuotaLimitBytes: quotaLimitBytes}, true
}

func (s *Store) IngestEdgeEvent(payload EdgeIngestPayload) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.events = append([]RequestProof{payload.Proof}, s.events...)
	payload.EdgeLog.ID = s.nextLogID()
	s.logs = append([]ServiceLog{payload.EdgeLog}, s.logs...)
	s.appendLogLocked(ServiceLog{Service: "api", Level: "INFO", RequestID: payload.Proof.RequestID, TraceID: payload.Proof.TraceID, DomainID: payload.Proof.DomainID, Revision: payload.Proof.RevisionID, Event: "edge.ingest", Outcome: payload.Proof.FinalDisposition, Message: "Ingested edge proof into Go analytics state.", Timestamp: now()})
}

func (s *Store) appendLogLocked(log ServiceLog) {
	log.ID = s.nextLogID()
	s.logs = append([]ServiceLog{log}, s.logs...)
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
