CREATE TABLE IF NOT EXISTS control_domains (
  id TEXT PRIMARY KEY,
  hostname TEXT NOT NULL,
  status TEXT NOT NULL,
  active_revision TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS request_events (
  request_id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS service_logs (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL,
  service TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_control_domains_hostname ON control_domains (hostname);
CREATE INDEX IF NOT EXISTS idx_request_events_domain_created ON request_events (domain_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_logs_domain_created ON service_logs (domain_id, created_at DESC);
