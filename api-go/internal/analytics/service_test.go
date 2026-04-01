package analytics

import (
	"context"
	"encoding/base64"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestInsertRequestEventEncodesQueryAndAppliesAuth(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.URL.Query().Get("query"); got != "INSERT INTO cdn_demo.request_events FORMAT JSONEachRow" {
			t.Fatalf("unexpected insert query: %q", got)
		}
		expectedAuth := "Basic " + base64.StdEncoding.EncodeToString([]byte("default:demo-clickhouse"))
		if got := r.Header.Get("Authorization"); got != expectedAuth {
			t.Fatalf("unexpected auth header: %q", got)
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatalf("read body: %v", err)
		}
		payload := string(body)
		if !strings.Contains(payload, `"request_id":"req-1"`) {
			t.Fatalf("expected request payload, got %q", string(body))
		}
		if !strings.Contains(payload, `"timestamp":"2026-04-01 00:00:00.000"`) {
			t.Fatalf("expected normalized clickhouse timestamp, got %q", payload)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	service := &Service{
		baseURL:  server.URL,
		username: "default",
		password: "demo-clickhouse",
		client:   &http.Client{Timeout: time.Second},
	}

	err := service.InsertRequestEvent(context.Background(), Event{
		RequestID:        "req-1",
		TraceID:          "trace-1",
		DomainID:         "zone-1",
		Hostname:         "ready-demo.northstarcdn.test",
		Path:             "/assets/demo.css",
		RevisionID:       "rev-1",
		CacheStatus:      "HIT",
		FinalDisposition: "served",
		BytesServed:      128,
		QuotaUsedBytes:   128,
		QuotaLimitBytes:  150000,
		Message:          "served from cache",
		Timestamp:        "2026-04-01T00:00:00Z",
	})
	if err != nil {
		t.Fatalf("insert request event: %v", err)
	}
}

func TestHealthyAppliesAuth(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/ping" {
			t.Fatalf("unexpected path: %q", r.URL.Path)
		}
		expectedAuth := "Basic " + base64.StdEncoding.EncodeToString([]byte("default:demo-clickhouse"))
		if got := r.Header.Get("Authorization"); got != expectedAuth {
			t.Fatalf("unexpected auth header: %q", got)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	service := &Service{
		baseURL:  server.URL,
		username: "default",
		password: "demo-clickhouse",
		client:   &http.Client{Timeout: time.Second},
	}

	if err := service.Healthy(context.Background()); err != nil {
		t.Fatalf("healthy: %v", err)
	}
}

func TestQuerySummaryDecodesStringifiedAggregates(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		expectedAuth := "Basic " + base64.StdEncoding.EncodeToString([]byte("default:demo-clickhouse"))
		if got := r.Header.Get("Authorization"); got != expectedAuth {
			t.Fatalf("unexpected auth header: %q", got)
		}
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST request, got %s", r.Method)
		}
		_, _ = io.ReadAll(r.Body)
		_, _ = w.Write([]byte(`{"total_requests":"3","served_requests":"2","blocked_requests":"1","bandwidth_bytes":"345","cache_hits":"1","cache_misses":"1","cache_bypass":"1","cache_value_bytes":"123","latest_timestamp":"2026-04-01 00:00:00.000"}`))
	}))
	defer server.Close()

	service := &Service{
		baseURL:  server.URL,
		username: "default",
		password: "demo-clickhouse",
		client:   &http.Client{Timeout: time.Second},
	}

	summary, err := service.QuerySummary(context.Background(), "zone-1", 150000)
	if err != nil {
		t.Fatalf("query summary: %v", err)
	}
	if summary.TotalRequests != 3 || summary.ServedRequests != 2 || summary.BlockedRequests != 1 {
		t.Fatalf("unexpected summary counts: %+v", summary)
	}
	if summary.BandwidthBytes != 345 || summary.CacheHits != 1 || summary.CacheMisses != 1 || summary.CacheBypass != 1 {
		t.Fatalf("unexpected summary metrics: %+v", summary)
	}
	if summary.CacheValueBytes != 123 {
		t.Fatalf("unexpected cache value bytes: %+v", summary)
	}
	if summary.Freshness != "live" || summary.Status != QueryStatusLive {
		t.Fatalf("expected live summary, got %+v", summary)
	}
	if summary.HitRatio != 1.0/3.0 {
		t.Fatalf("unexpected hit ratio: %v", summary.HitRatio)
	}
}

func TestFormatClickHouseTimestamp(t *testing.T) {
	got := formatClickHouseTimestamp("2026-04-01T10:09:35.116433248+00:00")
	if got != "2026-04-01 10:09:35.116" {
		t.Fatalf("unexpected clickhouse timestamp format: %q", got)
	}
}
