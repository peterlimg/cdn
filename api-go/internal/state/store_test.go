package state

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	analyticsstore "cdn-demo/api-go/internal/analytics"
)

type analyticsStub struct {
	enabled    bool
	summary    analyticsstore.Summary
	insertErr  error
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
		t.Fatalf("expected clickhouse summary query to be skipped after insert failure, got %d calls", analytics.queryCalls)
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
