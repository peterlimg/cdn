package analytics

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type Event struct {
	RequestID        string
	TraceID          string
	DomainID         string
	Hostname         string
	Path             string
	RevisionID       string
	CacheStatus      string
	FinalDisposition string
	BytesServed      int
	QuotaUsedBytes   int
	QuotaLimitBytes  int
	Message          string
	Timestamp        string
}

type QueryStatus string

const (
	QueryStatusLive     QueryStatus = "live"
	QueryStatusUpdating QueryStatus = "updating"
	QueryStatusDegraded QueryStatus = "degraded"
)

type Summary struct {
	TotalRequests   int
	ServedRequests  int
	BlockedRequests int
	BandwidthBytes  int
	CacheHits       int
	CacheMisses     int
	CacheBypass     int
	HitRatio        float64
	CacheValueBytes int
	QuotaUsedBytes  int
	QuotaLimitBytes int
	QuotaReached    bool
	Freshness       string
	Status          QueryStatus
}

type Service struct {
	baseURL string
	client  *http.Client
}

func OpenFromEnv() *Service {
	baseURL := strings.TrimRight(os.Getenv("CLICKHOUSE_URL"), "/")
	if baseURL == "" {
		return nil
	}
	return &Service{
		baseURL: baseURL,
		client:  &http.Client{Timeout: 3 * time.Second},
	}
}

func (s *Service) Enabled() bool {
	return s != nil && s.baseURL != ""
}

func (s *Service) Healthy(ctx context.Context) error {
	if !s.Enabled() {
		return nil
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL+"/ping", nil)
	if err != nil {
		return err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("clickhouse health failed with status %d", resp.StatusCode)
	}
	return nil
}

func (s *Service) InsertRequestEvent(ctx context.Context, event Event) error {
	if !s.Enabled() {
		return nil
	}
	body, err := json.Marshal(map[string]any{
		"request_id":        event.RequestID,
		"trace_id":          event.TraceID,
		"domain_id":         event.DomainID,
		"hostname":          event.Hostname,
		"path":              event.Path,
		"revision_id":       event.RevisionID,
		"cache_status":      event.CacheStatus,
		"final_disposition": event.FinalDisposition,
		"bytes_served":      event.BytesServed,
		"quota_used_bytes":  event.QuotaUsedBytes,
		"quota_limit_bytes": event.QuotaLimitBytes,
		"message":           event.Message,
		"timestamp":         event.Timestamp,
	})
	if err != nil {
		return err
	}

	query := s.baseURL + "/?query=" +
		"INSERT INTO cdn_demo.request_events FORMAT JSONEachRow"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, query, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		message, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("clickhouse insert failed with status %d: %s", resp.StatusCode, strings.TrimSpace(string(message)))
	}
	return nil
}

func (s *Service) Reset(ctx context.Context) error {
	if !s.Enabled() {
		return nil
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL, strings.NewReader("TRUNCATE TABLE cdn_demo.request_events"))
	if err != nil {
		return err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		message, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("clickhouse reset failed with status %d: %s", resp.StatusCode, strings.TrimSpace(string(message)))
	}
	return nil
}

func (s *Service) QuerySummary(ctx context.Context, domainID string, quotaLimitBytes int) (Summary, error) {
	if !s.Enabled() {
		return Summary{}, fmt.Errorf("clickhouse is not configured")
	}

	filter := ""
	if domainID != "" {
		filter = fmt.Sprintf("WHERE domain_id = '%s'", strings.ReplaceAll(domainID, "'", "''"))
	}
	query := fmt.Sprintf(`
SELECT
  count() AS total_requests,
  countIf(final_disposition = 'served') AS served_requests,
  countIf(final_disposition = 'blocked') AS blocked_requests,
  sumIf(bytes_served, final_disposition = 'served') AS bandwidth_bytes,
  countIf(cache_status = 'HIT') AS cache_hits,
  countIf(cache_status = 'MISS') AS cache_misses,
  countIf(cache_status = 'BYPASS') AS cache_bypass,
  sumIf(bytes_served, cache_status = 'HIT') AS cache_value_bytes,
  max(timestamp) AS latest_timestamp
FROM cdn_demo.request_events
%s
FORMAT JSONEachRow`, filter)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL, strings.NewReader(query))
	if err != nil {
		return Summary{}, err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return Summary{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		message, _ := io.ReadAll(resp.Body)
		return Summary{}, fmt.Errorf("clickhouse query failed with status %d: %s", resp.StatusCode, strings.TrimSpace(string(message)))
	}

	var row struct {
		TotalRequests   int    `json:"total_requests"`
		ServedRequests  int    `json:"served_requests"`
		BlockedRequests int    `json:"blocked_requests"`
		BandwidthBytes  int    `json:"bandwidth_bytes"`
		CacheHits       int    `json:"cache_hits"`
		CacheMisses     int    `json:"cache_misses"`
		CacheBypass     int    `json:"cache_bypass"`
		CacheValueBytes int    `json:"cache_value_bytes"`
		LatestTimestamp string `json:"latest_timestamp"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&row); err != nil {
		return Summary{}, err
	}

	hitRatio := 0.0
	denominator := row.CacheHits + row.CacheMisses + row.CacheBypass
	if denominator > 0 {
		hitRatio = float64(row.CacheHits) / float64(denominator)
	}
	freshness := "live"
	status := QueryStatusLive
	if row.LatestTimestamp == "" || row.TotalRequests == 0 {
		freshness = "updating"
		status = QueryStatusUpdating
	}

	return Summary{
		TotalRequests:   row.TotalRequests,
		ServedRequests:  row.ServedRequests,
		BlockedRequests: row.BlockedRequests,
		BandwidthBytes:  row.BandwidthBytes,
		CacheHits:       row.CacheHits,
		CacheMisses:     row.CacheMisses,
		CacheBypass:     row.CacheBypass,
		HitRatio:        hitRatio,
		CacheValueBytes: row.CacheValueBytes,
		QuotaUsedBytes:  row.BandwidthBytes,
		QuotaLimitBytes: quotaLimitBytes,
		QuotaReached:    row.BandwidthBytes >= quotaLimitBytes,
		Freshness:       freshness,
		Status:          status,
	}, nil
}
