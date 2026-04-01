package analytics

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
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

type clickhouseInt int

func (v *clickhouseInt) UnmarshalJSON(data []byte) error {
	trimmed := strings.TrimSpace(string(data))
	if trimmed == "null" || trimmed == "" {
		*v = 0
		return nil
	}
	trimmed = strings.Trim(trimmed, `"`)
	parsed, err := strconv.Atoi(trimmed)
	if err != nil {
		return err
	}
	*v = clickhouseInt(parsed)
	return nil
}

type Service struct {
	baseURL  string
	username string
	password string
	client   *http.Client
}

func OpenFromEnv() *Service {
	baseURL := strings.TrimRight(os.Getenv("CLICKHOUSE_URL"), "/")
	if baseURL == "" {
		return nil
	}
	username := os.Getenv("CLICKHOUSE_USER")
	if username == "" {
		username = "default"
	}
	return &Service{
		baseURL:  baseURL,
		username: username,
		password: os.Getenv("CLICKHOUSE_PASSWORD"),
		client:   &http.Client{Timeout: 3 * time.Second},
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
	s.applyAuth(req)
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
		"timestamp":         formatClickHouseTimestamp(event.Timestamp),
	})
	if err != nil {
		return err
	}

	endpoint, err := url.Parse(s.baseURL + "/")
	if err != nil {
		return err
	}
	params := endpoint.Query()
	params.Set("query", "INSERT INTO cdn_demo.request_events FORMAT JSONEachRow")
	endpoint.RawQuery = params.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint.String(), bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	s.applyAuth(req)
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
	s.applyAuth(req)
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
	s.applyAuth(req)
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
		TotalRequests   clickhouseInt `json:"total_requests"`
		ServedRequests  clickhouseInt `json:"served_requests"`
		BlockedRequests clickhouseInt `json:"blocked_requests"`
		BandwidthBytes  clickhouseInt `json:"bandwidth_bytes"`
		CacheHits       clickhouseInt `json:"cache_hits"`
		CacheMisses     clickhouseInt `json:"cache_misses"`
		CacheBypass     clickhouseInt `json:"cache_bypass"`
		CacheValueBytes clickhouseInt `json:"cache_value_bytes"`
		LatestTimestamp string        `json:"latest_timestamp"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&row); err != nil {
		return Summary{}, err
	}

	totalRequests := int(row.TotalRequests)
	servedRequests := int(row.ServedRequests)
	blockedRequests := int(row.BlockedRequests)
	bandwidthBytes := int(row.BandwidthBytes)
	cacheHits := int(row.CacheHits)
	cacheMisses := int(row.CacheMisses)
	cacheBypass := int(row.CacheBypass)
	cacheValueBytes := int(row.CacheValueBytes)

	hitRatio := 0.0
	denominator := cacheHits + cacheMisses + cacheBypass
	if denominator > 0 {
		hitRatio = float64(cacheHits) / float64(denominator)
	}
	freshness := "live"
	status := QueryStatusLive
	if row.LatestTimestamp == "" || totalRequests == 0 {
		freshness = "updating"
		status = QueryStatusUpdating
	}

	return Summary{
		TotalRequests:   totalRequests,
		ServedRequests:  servedRequests,
		BlockedRequests: blockedRequests,
		BandwidthBytes:  bandwidthBytes,
		CacheHits:       cacheHits,
		CacheMisses:     cacheMisses,
		CacheBypass:     cacheBypass,
		HitRatio:        hitRatio,
		CacheValueBytes: cacheValueBytes,
		QuotaUsedBytes:  bandwidthBytes,
		QuotaLimitBytes: quotaLimitBytes,
		QuotaReached:    bandwidthBytes >= quotaLimitBytes,
		Freshness:       freshness,
		Status:          status,
	}, nil
}

func (s *Service) applyAuth(req *http.Request) {
	if s.username == "" {
		return
	}
	req.SetBasicAuth(s.username, s.password)
}

func formatClickHouseTimestamp(value string) string {
	if value == "" {
		return value
	}
	parsed, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return value
	}
	return parsed.UTC().Format("2006-01-02 15:04:05.000")
}
