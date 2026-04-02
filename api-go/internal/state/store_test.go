package state

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	analyticsstore "cdn-demo/api-go/internal/analytics"
)

type analyticsStub struct {
	enabled    bool
	summary    analyticsstore.Summary
	insertErr  error
	queryErr   error
	queryCalls int
	inserted   []analyticsstore.Event
}

func (a *analyticsStub) Enabled() bool {
	return a.enabled
}

func (a *analyticsStub) Healthy(context.Context) error {
	return nil
}

func (a *analyticsStub) InsertRequestEvent(_ context.Context, event analyticsstore.Event) error {
	a.inserted = append(a.inserted, event)
	return a.insertErr
}

func (a *analyticsStub) Reset(context.Context) error {
	return nil
}

func (a *analyticsStub) QuerySummary(context.Context, string, int) (analyticsstore.Summary, error) {
	a.queryCalls++
	if a.queryErr != nil {
		return analyticsstore.Summary{}, a.queryErr
	}
	return a.summary, nil
}

func TestAnalyticsFallsBackToLocalSummaryAfterInsertFailure(t *testing.T) {
	analytics := &analyticsStub{
		enabled:   true,
		insertErr: errors.New("clickhouse unavailable"),
		summary: analyticsstore.Summary{
			TotalRequests:  99,
			ServedRequests: 99,
			BandwidthBytes: 9999,
			Freshness:      "live",
			Status:         analyticsstore.QueryStatusLive,
		},
	}
	store := NewStore(nil, analytics)
	domain, err := store.CreateDomain(CreateDomainInput{Hostname: "ready-demo.northstarcdn.test", Mode: string(DomainReady)})
	if err != nil {
		t.Fatalf("create domain: %v", err)
	}

	err = store.IngestEdgeEvent(EdgeIngestPayload{
		Proof: RequestProof{
			RequestID:        "req-1",
			TraceID:          "trace-1",
			DomainID:         domain.ID,
			Hostname:         domain.Hostname,
			Path:             "/assets/demo.css",
			Timestamp:        now(),
			RevisionID:       domain.ActiveRevision,
			CacheStatus:      "HIT",
			FinalDisposition: "served",
			BytesServed:      128,
			QuotaUsedBytes:   128,
			QuotaLimitBytes:  quotaLimitBytes,
			Message:          "served from cache",
		},
		EdgeLog: ServiceLog{
			Service:   "edge",
			Level:     "INFO",
			RequestID: "req-1",
			TraceID:   "trace-1",
			DomainID:  domain.ID,
			Revision:  domain.ActiveRevision,
			Event:     "edge.evaluate",
			Outcome:   "HIT",
			Message:   "Rust edge evaluated request with outcome HIT",
			Timestamp: now(),
		},
	})
	if err != nil {
		t.Fatalf("ingest should still persist locally: %v", err)
	}

	summary := store.Analytics(domain.ID)
	if summary.TotalRequests != 1 {
		t.Fatalf("expected local total requests to be used, got %d", summary.TotalRequests)
	}
	if summary.BandwidthBytes != 128 {
		t.Fatalf("expected local bandwidth bytes to be used, got %d", summary.BandwidthBytes)
	}
	if summary.Freshness != "degraded" {
		t.Fatalf("expected degraded freshness after insert failure, got %q", summary.Freshness)
	}
	if analytics.queryCalls != 0 {
		t.Fatalf("expected clickhouse summary query to stay skipped after ingest failure, got %d calls", analytics.queryCalls)
	}
}

func TestAnalyticsRecoversAfterTransientQueryFailure(t *testing.T) {
	analytics := &analyticsStub{
		enabled: true,
		summary: analyticsstore.Summary{
			TotalRequests:   9,
			ServedRequests:  9,
			BlockedRequests: 0,
			BandwidthBytes:  900,
			CacheHits:       8,
			CacheMisses:     1,
			CacheBypass:     0,
			HitRatio:        8.0 / 9.0,
			CacheValueBytes: 800,
			QuotaUsedBytes:  900,
			QuotaLimitBytes: quotaLimitBytes,
			QuotaReached:    false,
			Freshness:       "live",
			Status:          analyticsstore.QueryStatusLive,
		},
	}
	store := NewStore(nil, analytics)
	domain, err := store.CreateDomain(CreateDomainInput{Hostname: "ready-demo.northstarcdn.test", Mode: string(DomainReady)})
	if err != nil {
		t.Fatalf("create domain: %v", err)
	}

	err = store.IngestEdgeEvent(EdgeIngestPayload{
		Proof: RequestProof{
			RequestID:        "req-1",
			TraceID:          "trace-1",
			DomainID:         domain.ID,
			Hostname:         domain.Hostname,
			Path:             "/assets/demo.css",
			Timestamp:        now(),
			RevisionID:       domain.ActiveRevision,
			CacheStatus:      "HIT",
			FinalDisposition: "served",
			BytesServed:      128,
			QuotaUsedBytes:   128,
			QuotaLimitBytes:  quotaLimitBytes,
			Message:          "served from cache",
		},
		EdgeLog: ServiceLog{
			Service:   "edge",
			Level:     "INFO",
			RequestID: "req-1",
			TraceID:   "trace-1",
			DomainID:  domain.ID,
			Revision:  domain.ActiveRevision,
			Event:     "edge.evaluate",
			Outcome:   "HIT",
			Message:   "Rust edge evaluated request with outcome HIT",
			Timestamp: now(),
		},
	})
	if err != nil {
		t.Fatalf("ingest should succeed: %v", err)
	}

	analytics.queryErr = errors.New("temporary query error")
	degraded := store.Analytics(domain.ID)
	if degraded.Freshness != "degraded" {
		t.Fatalf("expected degraded freshness after query failure, got %q", degraded.Freshness)
	}
	if degraded.TotalRequests != 1 {
		t.Fatalf("expected local fallback total requests after query failure, got %d", degraded.TotalRequests)
	}

	analytics.queryErr = nil
	recovered := store.Analytics(domain.ID)
	if recovered.Freshness != "live" {
		t.Fatalf("expected live freshness after query recovery, got %q", recovered.Freshness)
	}
	if recovered.TotalRequests != 9 {
		t.Fatalf("expected ClickHouse total requests after query recovery, got %d", recovered.TotalRequests)
	}
	if analytics.queryCalls != 2 {
		t.Fatalf("expected query recovery to require two query attempts, got %d calls", analytics.queryCalls)
	}
}

func TestAnalyticsWarningReflectsGuardedIngestFallback(t *testing.T) {
	analytics := &analyticsStub{enabled: true, insertErr: errors.New("clickhouse unavailable")}
	store := NewStore(nil, analytics)
	domain, err := store.CreateDomain(CreateDomainInput{Hostname: "ready-demo.northstarcdn.test", Mode: string(DomainReady)})
	if err != nil {
		t.Fatalf("create domain: %v", err)
	}

	err = store.IngestEdgeEvent(EdgeIngestPayload{
		Proof: RequestProof{
			RequestID:        "req-1",
			TraceID:          "trace-1",
			DomainID:         domain.ID,
			Hostname:         domain.Hostname,
			Path:             "/assets/demo.css",
			Timestamp:        now(),
			RevisionID:       domain.ActiveRevision,
			CacheStatus:      "HIT",
			FinalDisposition: "served",
			BytesServed:      128,
			QuotaUsedBytes:   128,
			QuotaLimitBytes:  quotaLimitBytes,
			Message:          "served from cache",
		},
		EdgeLog: ServiceLog{
			Service:   "edge",
			Level:     "INFO",
			RequestID: "req-1",
			TraceID:   "trace-1",
			DomainID:  domain.ID,
			Revision:  domain.ActiveRevision,
			Event:     "edge.evaluate",
			Outcome:   "HIT",
			Message:   "Rust edge evaluated request with outcome HIT",
			Timestamp: now(),
		},
	})
	if err != nil {
		t.Fatalf("ingest should still persist locally: %v", err)
	}

	warning := store.AnalyticsWarning()
	if warning == "" {
		t.Fatal("expected warning for guarded ingest fallback")
	}
	if !strings.Contains(warning, "guarded fallback") {
		t.Fatalf("expected guarded fallback warning, got %q", warning)
	}
}

func TestUpdateDomainSetupRejectsUnsafeExistingOrigin(t *testing.T) {
	store := NewStore(nil, nil)
	domain, err := store.CreateDomain(CreateDomainInput{
		Hostname:  "pending-demo.northstarcdn.test",
		Mode:      string(DomainPending),
		Origin:    "https://static.example.com",
		SetupPath: "existing-origin",
	})
	if err != nil {
		t.Fatalf("create domain: %v", err)
	}

	updated, ok := store.UpdateDomainSetup(domain.ID, UpdateDomainSetupInput{
		Origin:    "http://127.0.0.1:3000/origin",
		SetupPath: "existing-origin",
	})
	if !ok {
		t.Fatal("expected domain to exist")
	}
	if updated.OriginStatus != "failed" {
		t.Fatalf("expected failed origin status, got %q", updated.OriginStatus)
	}
	if updated.Status != DomainPending {
		t.Fatalf("expected pending status, got %q", updated.Status)
	}
	if updated.DNSStatus != "pending" {
		t.Fatalf("expected pending dns status, got %q", updated.DNSStatus)
	}
	if updated.OriginValidationMessage == "" {
		t.Fatal("expected origin validation message")
	}

	verified, ok := store.VerifyDomainDNS(domain.ID)
	if !ok {
		t.Fatal("expected domain to exist during dns verification")
	}
	if verified.Status != DomainPending {
		t.Fatalf("expected dns verification to keep pending status, got %q", verified.Status)
	}
	if verified.DNSStatus != "pending" {
		t.Fatalf("expected dns verification to stay pending, got %q", verified.DNSStatus)
	}
}

func TestVerifyDomainDNSPromotesHealthyOrigin(t *testing.T) {
	store := NewStore(nil, nil)
	originServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/healthz" {
			http.NotFound(w, r)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer originServer.Close()
	parsedURL, err := url.Parse(originServer.URL)
	if err != nil {
		t.Fatalf("parse origin server url: %v", err)
	}
	publicishOrigin := fmt.Sprintf("http://127.0.0.1.nip.io:%s", parsedURL.Port())

	domain, err := store.CreateDomain(CreateDomainInput{
		Hostname:        "pending-demo.northstarcdn.test",
		Mode:            string(DomainPending),
		Origin:          publicishOrigin,
		HealthCheckPath: "/healthz",
		SetupPath:       "existing-origin",
	})
	if err != nil {
		t.Fatalf("create domain: %v", err)
	}

	updated, ok := store.UpdateDomainSetup(domain.ID, UpdateDomainSetupInput{
		Origin:          publicishOrigin,
		HealthCheckPath: "/healthz",
		SetupPath:       "existing-origin",
	})
	if !ok {
		t.Fatal("expected domain to exist")
	}
	if updated.OriginStatus != "healthy" {
		t.Fatalf("expected healthy origin status, got %q", updated.OriginStatus)
	}
	if updated.LastOriginCheckAt == "" {
		t.Fatal("expected last origin check timestamp after setup update")
	}
	if updated.LastOriginCheckOutcome != "healthy" {
		t.Fatalf("expected healthy last origin check outcome, got %q", updated.LastOriginCheckOutcome)
	}
	if updated.HealthCheckPath != "/healthz" {
		t.Fatalf("expected health check path to persist, got %q", updated.HealthCheckPath)
	}
	if updated.RouteHint != "/healthz" {
		t.Fatalf("expected route hint to persist alongside health check path, got %q", updated.RouteHint)
	}

	verified, ok := store.VerifyDomainDNS(domain.ID)
	if !ok {
		t.Fatal("expected domain to exist during dns verification")
	}
	if verified.Status != DomainReady {
		t.Fatalf("expected ready status after dns verification, got %q", verified.Status)
	}
	if verified.DNSStatus != "verified" {
		t.Fatalf("expected verified dns status, got %q", verified.DNSStatus)
	}
	if verified.SetupStage != "ready" {
		t.Fatalf("expected ready setup stage, got %q", verified.SetupStage)
	}
	if verified.RouteHint != "/healthz" {
		t.Fatalf("expected route hint to remain aligned after dns verification, got %q", verified.RouteHint)
	}
}

func TestUpdateDomainSetupFailsWhenOriginIsUnreachable(t *testing.T) {
	store := NewStore(nil, nil)
	domain, err := store.CreateDomain(CreateDomainInput{
		Hostname:  "pending-demo.northstarcdn.test",
		Mode:      string(DomainPending),
		Origin:    "https://static.example.com",
		SetupPath: "existing-origin",
	})
	if err != nil {
		t.Fatalf("create domain: %v", err)
	}

	updated, ok := store.UpdateDomainSetup(domain.ID, UpdateDomainSetupInput{
		Origin:    "https://127.0.0.1.nip.io:9",
		SetupPath: "existing-origin",
	})
	if !ok {
		t.Fatal("expected domain to exist")
	}
	if updated.OriginStatus != "failed" {
		t.Fatalf("expected failed origin status, got %q", updated.OriginStatus)
	}
	if updated.OriginValidationMessage != "Origin did not respond to the health check path." {
		t.Fatalf("unexpected origin validation message: %q", updated.OriginValidationMessage)
	}
}

func TestRecheckOriginRevalidatesStoredOrigin(t *testing.T) {
	store := NewStore(nil, nil)
	domain, err := store.CreateDomain(CreateDomainInput{
		Hostname:  "pending-demo.northstarcdn.test",
		Mode:      string(DomainPending),
		Origin:    "https://static.example.com",
		SetupPath: "existing-origin",
	})
	if err != nil {
		t.Fatalf("create domain: %v", err)
	}

	rechecked, ok := store.RecheckOrigin(domain.ID)
	if !ok {
		t.Fatal("expected domain to exist")
	}
	if rechecked.OriginStatus != "failed" {
		t.Fatalf("expected failed origin status, got %q", rechecked.OriginStatus)
	}
	if rechecked.OriginValidationMessage == "" {
		t.Fatal("expected origin validation message after recheck")
	}
	if rechecked.LastOriginCheckAt == "" {
		t.Fatal("expected last origin check timestamp after recheck")
	}
}

func TestCreateDomainRejectsDuplicateHostname(t *testing.T) {
	store := NewStore(nil, nil)
	_, err := store.CreateDomain(CreateDomainInput{Hostname: "Test.NorthstarCDN.test", Mode: string(DomainReady)})
	if err != nil {
		t.Fatalf("first create should succeed: %v", err)
	}

	_, err = store.CreateDomain(CreateDomainInput{Hostname: "test.northstarcdn.test", Mode: string(DomainReady)})
	if err == nil {
		t.Fatal("expected duplicate hostname to be rejected")
	}
	if err.Error() != "hostname already exists" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestExistingOriginLegacyRouteHintBackfillsToHealthCheckPath(t *testing.T) {
	domain := DomainRecord{
		SetupPath:       "existing-origin",
		HealthCheckPath: "/",
		RouteHint:       "/assets/demo.css",
	}

	domain.HealthCheckPath = normalizeHealthCheckPath(domain.HealthCheckPath, domain.SetupPath)
	if domain.RouteHint == "" || (domain.SetupPath == "existing-origin" && domain.RouteHint == "/assets/demo.css") {
		domain.RouteHint = domain.HealthCheckPath
	}

	if domain.RouteHint != "/" {
		t.Fatalf("expected route hint to backfill to root path, got %q", domain.RouteHint)
	}
}

func TestGetDomainByHostnameReturnsErrorForAmbiguousMatches(t *testing.T) {
	store := NewStore(nil, nil)
	store.domains["zone-1"] = DomainRecord{ID: "zone-1", Hostname: "dup.northstarcdn.test"}
	store.domains["zone-2"] = DomainRecord{ID: "zone-2", Hostname: "DUP.northstarcdn.test"}

	_, ok, err := store.GetDomainByHostname("dup.northstarcdn.test")
	if err == nil {
		t.Fatal("expected ambiguous hostname lookup to fail")
	}
	if ok {
		t.Fatal("expected ambiguous hostname lookup to not return a domain")
	}
	if err.Error() != "multiple domains found for hostname" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestCreateDomainDefaultsToAllEligibleEdgePlacement(t *testing.T) {
	store := NewStore(nil, nil)
	domain, err := store.CreateDomain(CreateDomainInput{Hostname: "ready-demo.northstarcdn.test", Mode: string(DomainReady)})
	if err != nil {
		fatalf := t.Fatalf
		fatalf("create domain: %v", err)
	}

	if domain.EdgePlacement.Mode != EdgePlacementAllEligible {
		t.Fatalf("expected all-eligible placement, got %q", domain.EdgePlacement.Mode)
	}
	if len(domain.EdgePlacement.TargetNodeIDs) != len(store.edgeTopology) {
		t.Fatalf("expected all topology nodes to be targeted, got %d", len(domain.EdgePlacement.TargetNodeIDs))
	}
	if domain.EdgeRollout.TargetNodeCount != len(store.edgeTopology) {
		t.Fatalf("expected rollout target count to match topology, got %d", domain.EdgeRollout.TargetNodeCount)
	}
	if domain.AppliedRevision != domain.Revisions[0].ID {
		t.Fatalf("expected applied revision to stay at baseline before any acknowledgements, got %q", domain.AppliedRevision)
	}
	if domain.EdgePlacement.Summary == "" {
		t.Fatal("expected placement summary")
	}
}

func TestCreateDomainSubsetPlacementDeduplicatesSelection(t *testing.T) {
	store := NewStore(nil, nil)
	domain, err := store.CreateDomain(CreateDomainInput{
		Hostname:            "subset-demo.northstarcdn.test",
		Mode:                string(DomainReady),
		EdgePlacementMode:   string(EdgePlacementSubset),
		EdgeSelectedNodeIDs: []string{"edge-us-east", "edge-us-east", "edge-eu-west"},
	})
	if err != nil {
		t.Fatalf("create domain: %v", err)
	}

	if len(domain.EdgePlacement.SelectedNodeIDs) != 2 {
		t.Fatalf("expected duplicate node IDs to be removed, got %v", domain.EdgePlacement.SelectedNodeIDs)
	}
	if len(domain.EdgePlacement.TargetNodeIDs) != 2 {
		t.Fatalf("expected two target nodes, got %v", domain.EdgePlacement.TargetNodeIDs)
	}
	if domain.EdgeRollout.TargetNodeCount != 2 {
		t.Fatalf("expected rollout target count of 2, got %d", domain.EdgeRollout.TargetNodeCount)
	}
}

func TestCreateDomainRejectsUnknownEdgeNode(t *testing.T) {
	store := NewStore(nil, nil)
	_, err := store.CreateDomain(CreateDomainInput{
		Hostname:            "invalid-demo.northstarcdn.test",
		Mode:                string(DomainReady),
		EdgePlacementMode:   string(EdgePlacementSubset),
		EdgeSelectedNodeIDs: []string{"edge-us-east", "edge-unknown"},
	})
	if err == nil {
		t.Fatal("expected invalid edge node selection to fail")
	}
	if err.Error() != "selected edge node is not available" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestCreateDomainRejectsEmptySubsetSelection(t *testing.T) {
	store := NewStore(nil, nil)
	_, err := store.CreateDomain(CreateDomainInput{
		Hostname:          "empty-subset-demo.northstarcdn.test",
		Mode:              string(DomainReady),
		EdgePlacementMode: string(EdgePlacementSubset),
	})
	if err == nil {
		t.Fatal("expected empty subset selection to fail")
	}
	if err.Error() != "select at least one edge node" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestGetDomainBackfillsLegacyPlacementFromTopology(t *testing.T) {
	store := NewStore(nil, nil)
	store.domains["zone-legacy"] = DomainRecord{
		ID:             "zone-legacy",
		Hostname:       "legacy-demo.northstarcdn.test",
		Origin:         "https://static.example.com",
		Status:         DomainReady,
		ReadinessNote:  "legacy",
		TruthLabel:     "live-proof",
		ActiveRevision: "rev-1",
		Revisions: []PolicyRevision{{
			ID:           "rev-1",
			CacheEnabled: false,
			Label:        "Baseline",
			CreatedAt:    now(),
		}},
	}

	domain, ok := store.GetDomain("zone-legacy")
	if !ok {
		t.Fatal("expected legacy domain to exist")
	}
	if domain.EdgePlacement.Mode != EdgePlacementAllEligible {
		t.Fatalf("expected legacy domain to backfill all-eligible placement, got %q", domain.EdgePlacement.Mode)
	}
	if len(domain.EdgePlacement.TargetNodeIDs) != len(store.edgeTopology) {
		t.Fatalf("expected legacy domain to target all topology nodes, got %d", len(domain.EdgePlacement.TargetNodeIDs))
	}
}

func TestRecordEdgeApplyPromotesActiveRevisionAfterTargetAcknowledgements(t *testing.T) {
	store := NewStore(nil, nil)
	domain, err := store.CreateDomain(CreateDomainInput{Hostname: "rollout-demo.northstarcdn.test", Mode: string(DomainReady)})
	if err != nil {
		t.Fatalf("create domain: %v", err)
	}

	revision, ok := store.PublishPolicy(domain.ID, true)
	if !ok {
		t.Fatal("expected publish to succeed")
	}

	updated, ok := store.GetDomain(domain.ID)
	if !ok {
		t.Fatal("expected domain to exist after publish")
	}
	if updated.ActiveRevision != revision.ID {
		t.Fatalf("expected active revision %q, got %q", revision.ID, updated.ActiveRevision)
	}
	if updated.AppliedRevision == revision.ID {
		t.Fatalf("expected applied revision to remain on previous revision before acknowledgements, got %q", updated.AppliedRevision)
	}
	if updated.EdgeRollout.PendingNodeCount != len(store.edgeTopology) {
		t.Fatalf("expected all nodes pending after publish, got %+v", updated.EdgeRollout)
	}

	for index, node := range store.edgeTopology {
		err := store.RecordEdgeApply(EdgeApplyAcknowledgement{
			DomainID:   domain.ID,
			NodeID:     node.ID,
			RevisionID: revision.ID,
			Status:     string(EdgeRolloutApplied),
			Timestamp:  now(),
		})
		if err != nil {
			t.Fatalf("record edge apply for %s: %v", node.ID, err)
		}
		current, ok := store.GetDomain(domain.ID)
		if !ok {
			t.Fatal("expected domain to exist during rollout")
		}
		if index < len(store.edgeTopology)-1 && current.AppliedRevision == revision.ID {
			t.Fatalf("expected applied revision to remain pending until all nodes acknowledge, got %q", current.AppliedRevision)
		}
	}

	finalDomain, ok := store.GetDomain(domain.ID)
	if !ok {
		t.Fatal("expected domain to exist after acknowledgements")
	}
	if finalDomain.AppliedRevision != revision.ID {
		t.Fatalf("expected applied revision to advance to %q, got %q", revision.ID, finalDomain.AppliedRevision)
	}
	if finalDomain.EdgeRollout.Status != "applied" {
		t.Fatalf("expected rollout status applied, got %q", finalDomain.EdgeRollout.Status)
	}
}
