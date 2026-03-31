package state

import (
	"context"
	"errors"
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
	domain := store.CreateDomain("ready-demo.northstarcdn.test", string(DomainReady))

	err := store.IngestEdgeEvent(EdgeIngestPayload{
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
