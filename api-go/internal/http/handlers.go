package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"

	"cdn-demo/api-go/internal/state"
)

type Server struct {
	store *state.Store
}

func NewServer(store *state.Store) *Server {
	return &Server{store: store}
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func decode(r *http.Request, target any) error {
	return json.NewDecoder(r.Body).Decode(target)
}

func (s *Server) Register(mux *http.ServeMux) {
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
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
	s.store.Reset()
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *Server) handleEdgeContext(w http.ResponseWriter, r *http.Request) {
	domainID := r.URL.Query().Get("domainId")
	context, ok := s.store.EdgeContext(domainID)
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "domain not found"})
		return
	}
	writeJSON(w, http.StatusOK, context)
}

func (s *Server) handleEdgeIngest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var payload state.EdgeIngestPayload
	if err := decode(r, &payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid ingest payload"})
		return
	}
	s.store.IngestEdgeEvent(payload)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
