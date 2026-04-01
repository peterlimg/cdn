package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"cdn-demo/api-go/internal/state"
)

func TestHealthReportsGuardedAnalyticsFallbackWarning(t *testing.T) {
	store := state.NewStore(nil, nil)
	store.SetAnalyticsGuardedFallbackForTest()

	server := NewServer(store)
	mux := http.NewServeMux()
	server.Register(mux)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", res.Code)
	}

	var body map[string]string
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body["analytics"] != "degraded" {
		t.Fatalf("expected analytics to be degraded, got %q", body["analytics"])
	}
	if body["warning"] != "clickhouse analytics are in guarded fallback after an earlier ingest failure; reset or reseed restores a trusted baseline" {
		t.Fatalf("unexpected warning: %q", body["warning"])
	}
}
