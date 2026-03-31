package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"cdn-demo/api-go/internal/limits"
	"cdn-demo/api-go/internal/state"
	"github.com/redis/go-redis/v9"
)

type Server struct {
	store         *state.Store
	redis         *redis.Client
	internalToken string
}

func NewServer(store *state.Store) *Server {
	redisURL := os.Getenv("REDIS_URL")
	options, err := redis.ParseURL(redisURL)
	if err != nil || redisURL == "" {
		options = &redis.Options{Addr: "127.0.0.1:6379"}
	}
	return &Server{store: store, redis: redis.NewClient(options), internalToken: os.Getenv("INTERNAL_API_TOKEN")}
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func (s *Server) requireInternalAuth(w http.ResponseWriter, r *http.Request) bool {
	if s.internalToken == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "internal auth is not configured"})
		return false
	}
	if r.Header.Get("X-Internal-Token") == s.internalToken {
		return true
	}
	writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
	return false
}

func decode(r *http.Request, target any) error {
	return json.NewDecoder(r.Body).Decode(target)
}

func (s *Server) Register(mux *http.ServeMux) {
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := s.store.Healthy(ctx); err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "degraded", "error": "postgres unavailable"})
			return
		}
		if os.Getenv("REDIS_URL") != "" {
			if err := s.redis.Ping(ctx).Err(); err != nil {
				writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "degraded", "error": "redis unavailable"})
				return
			}
		}
		if err := s.store.AnalyticsHealthy(ctx); err != nil {
			writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "analytics": "degraded", "warning": "clickhouse unavailable, falling back to local events"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("/dashboard", s.handleDashboard)
	mux.HandleFunc("/domains", s.handleDomains)
	mux.HandleFunc("/domains/", s.handleDomainByID)
	mux.HandleFunc("/policy", s.handlePolicy)
	mux.HandleFunc("/logs", s.handleLogs)
	mux.HandleFunc("/analytics", s.handleAnalytics)
	mux.HandleFunc("/proofs", s.handleProofs)
	mux.HandleFunc("/reset", s.handleReset)
	mux.HandleFunc("/internal/edge-context", s.handleEdgeContext)
	mux.HandleFunc("/internal/edge-ingest", s.handleEdgeIngest)
	mux.HandleFunc("/internal/rate-limit", s.handleRateLimit)
}

func (s *Server) handleDashboard(w http.ResponseWriter, r *http.Request) {
	domainID := r.URL.Query().Get("domainId")
	writeJSON(w, http.StatusOK, s.store.Dashboard(domainID))
}

func (s *Server) handleDomains(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, s.store.ListDomains())
	case http.MethodPost:
		var body struct {
			Hostname string `json:"hostname"`
			Mode     string `json:"mode"`
		}
		if err := decode(r, &body); err != nil || body.Hostname == "" || (body.Mode != "ready" && body.Mode != "pending") {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "hostname and mode are required"})
			return
		}
		writeJSON(w, http.StatusOK, s.store.CreateDomain(body.Hostname, body.Mode))
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleDomainByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/domains/")
	domain, ok := s.store.GetDomain(id)
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "domain not found"})
		return
	}
	writeJSON(w, http.StatusOK, domain)
}

func (s *Server) handlePolicy(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var body struct {
			DomainID     string `json:"domainId"`
			CacheEnabled bool   `json:"cacheEnabled"`
		}
		if err := decode(r, &body); err != nil || body.DomainID == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "domainId is required"})
			return
		}
		revision, ok := s.store.PublishPolicy(body.DomainID, body.CacheEnabled)
		if !ok {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "domain not found"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"revision": revision})
		return
	}
	if r.Method == http.MethodDelete {
		var body struct {
			DomainID string `json:"domainId"`
		}
		if err := decode(r, &body); err != nil || body.DomainID == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "domainId is required"})
			return
		}
		revision, ok := s.store.RollbackPolicy(body.DomainID)
		if !ok {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "domain not found"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"revision": revision})
		return
	}
	w.WriteHeader(http.StatusMethodNotAllowed)
}

func (s *Server) handleLogs(w http.ResponseWriter, r *http.Request) {
	domainID := r.URL.Query().Get("domainId")
	service := r.URL.Query().Get("service")
	requestID := r.URL.Query().Get("requestId")
	writeJSON(w, http.StatusOK, s.store.Logs(domainID, service, requestID))
}

func (s *Server) handleAnalytics(w http.ResponseWriter, r *http.Request) {
	domainID := r.URL.Query().Get("domainId")
	writeJSON(w, http.StatusOK, map[string]any{"analytics": s.store.Analytics(domainID), "quota": s.store.Quota(domainID)})
}

func (s *Server) handleProofs(w http.ResponseWriter, r *http.Request) {
	domainID := r.URL.Query().Get("domainId")
	writeJSON(w, http.StatusOK, s.store.Events(domainID))
}

func (s *Server) handleReset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if !s.requireInternalAuth(w, r) {
		return
	}
	if err := s.store.Reset(); err != nil {
		if errors.Is(err, state.ErrAnalyticsReset) {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "clickhouse reset failed"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "postgres reset failed"})
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if os.Getenv("REDIS_URL") != "" {
		if err := s.redis.FlushDB(ctx).Err(); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "redis reset failed"})
			return
		}
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *Server) handleEdgeContext(w http.ResponseWriter, r *http.Request) {
	if !s.requireInternalAuth(w, r) {
		return
	}
	domainID := r.URL.Query().Get("domainId")
	requestID := r.URL.Query().Get("requestId")
	traceID := r.URL.Query().Get("traceId")
	context, ok := s.store.EdgeContext(domainID, requestID, traceID)
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "domain not found"})
		return
	}
	writeJSON(w, http.StatusOK, context)
}

func (s *Server) handleEdgeIngest(w http.ResponseWriter, r *http.Request) {
	if !s.requireInternalAuth(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var payload state.EdgeIngestPayload
	if err := decode(r, &payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid ingest payload"})
		return
	}
	if err := s.store.IngestEdgeEvent(payload); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "edge ingest persist failed"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *Server) handleRateLimit(w http.ResponseWriter, r *http.Request) {
	if !s.requireInternalAuth(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		DomainID  string `json:"domainId"`
		RequestID string `json:"requestId"`
		TraceID   string `json:"traceId"`
	}
	if err := decode(r, &body); err != nil || body.DomainID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "domainId is required"})
		return
	}

	domain, ok := s.store.GetDomain(body.DomainID)
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "domain not found"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	windowSeconds := limits.DefaultWindowSeconds
	key := fmt.Sprintf("ratelimit:%s:%d", domain.ID, time.Now().UTC().Unix()/int64(windowSeconds))
	count, err := s.redis.Incr(ctx, key).Result()
	if err == nil {
		_, _ = s.redis.ExpireNX(ctx, key, time.Duration(windowSeconds)*time.Second).Result()
	}
	allowed := err != nil || int(count) <= domain.RateLimit
	if !allowed {
		s.store.RecordServiceLog(state.ServiceLog{
			Service:   "api",
			Level:     "WARN",
			RequestID: body.RequestID,
			TraceID:   traceIDOrDomain(body.TraceID, domain.ID),
			DomainID:  domain.ID,
			Revision:  domain.ActiveRevision,
			Event:     "limits.rate_limit",
			Outcome:   "blocked",
			Message:   fmt.Sprintf("Redis-backed rate limit blocked this request after %d requests in the active %d second window.", count, windowSeconds),
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"allowed": allowed, "count": count, "limit": domain.RateLimit, "windowSeconds": windowSeconds})
}

func traceIDOrDomain(traceID, domainID string) string {
	if traceID != "" {
		return traceID
	}
	return domainID
}
