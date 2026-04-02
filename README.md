# Northstar CDN

A CDN control-plane and edge prototype with a Next.js dashboard, Go control plane, and Rust edge runtime. It supports domain management, cache policy changes, public request evaluation, and evidence surfaces such as proofs, logs, and analytics.

## Architecture

Three-service runtime:

| Service | Language | Port | Role |
|---------|----------|------|------|
| UI | TypeScript / Next.js 16 | 3000 | Dashboard, API proxy layer |
| API | Go 1.22 | 4001 | Control plane, persistence, rate limiting |
| Edge | Rust (axum 0.8) | 4002 | Request evaluation, file-based caching, WAF |

Supporting infrastructure: PostgreSQL 17, Redis 7, ClickHouse 25.3, Nginx 1.27 (ingress).

```
Client → Nginx (:8080)
             ├── /edge/*  → Rust edge (:4002)
             └── /*       → Next.js UI (:3000) → Go API (:4001)
```

## Current Capabilities

1. **Sign in** — cookie-based HMAC session auth
2. **Create a site** — domain/zone with hostname and origin
3. **Configure origin** — health-check probing, DNS verification
4. **Publish cache policy** — enable caching, see revision history
5. **Send public requests** — live request evaluation through the Rust edge (BYPASS → MISS → HIT)
6. **View evidence** — request proofs, structured service logs, analytics
7. **Hit quota limits** — free-plan bandwidth enforcement (150KB), blocked requests
8. **Rollback** — revert cache policy to baseline

Edge request outcomes: `BYPASS`, `MISS`, `HIT`, `BLOCKED_QUOTA`, `BLOCKED_PENDING`, `BLOCKED_WAF`, `BLOCKED_RATE_LIMIT`, `ORIGIN_ERROR`.

## Current Support Boundary

This project currently supports `public/static-site traffic`, not a full application-delivery CDN.

Supported now:
- public/static origins behind the CDN
- hostname-to-origin routing
- Rust edge cache behavior for public traffic
- proof, logs, and analytics for the public request path
- operator login to the dashboard

Not safely supported yet:
- customer sites whose origin behavior depends on end-user login or credentials
- authenticated app traffic using `Cookie`, `Authorization`, or other request credentials
- login/logout/session-establishing flows that depend on response headers like `Set-Cookie`
- personalized or private responses that must never be shared through edge cache
- general dynamic application traffic that requires full request/response passthrough

Why this boundary exists:
- the current Rust edge proxy path is static-first and does not yet preserve the full request semantics needed by authenticated origins
- the current shared cache model is not safe for personalized responses

If you need mixed public/private site support later, the smallest safe next step is usually protected-route bypass rather than full authenticated caching.

## Prerequisites

- Node.js 22+
- Go 1.22+
- Rust (stable)
- Docker and Docker Compose

## Quick Start (Docker Compose)

```bash
make up
```

This starts all 7 services. Open `http://localhost:8080`.

Default tokens are set in the Makefile:
- `DEMO_RESET_TOKEN=demo-reset`
- `INTERNAL_API_TOKEN=demo-internal-token`

## Local Development

Start infrastructure dependencies:

```bash
docker compose up postgres redis clickhouse -d
```

Install frontend dependencies and run all three services:

```bash
npm install
npm run dev
```

Or run services individually:

```bash
npm run dev:ui     # Next.js on :3000
npm run dev:api    # Go API on :4001
npm run dev:edge   # Rust edge on :4002
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INTERNAL_API_TOKEN` | `demo-internal-token` | Inter-service auth token |
| `DEMO_RESET_TOKEN` | `demo-reset` | Auth token for reset/reseed routes |
| `DATABASE_URL` | `postgres://postgres:postgres@127.0.0.1:5433/cdn_demo?sslmode=disable` | PostgreSQL connection |
| `REDIS_URL` | `redis://127.0.0.1:6381/0` | Redis connection |
| `CLICKHOUSE_URL` | *(empty = disabled)* | ClickHouse connection (analytics degrade gracefully without it) |
| `CLICKHOUSE_USER` | `default` | ClickHouse HTTP username |
| `CLICKHOUSE_PASSWORD` | `demo-clickhouse` | ClickHouse HTTP password for local compose |
| `GO_API_URL` | `http://127.0.0.1:4001` | Go API base URL |
| `RUST_EDGE_URL` | `http://127.0.0.1:4002` | Generic Rust edge base URL. Through Docker this points at Nginx's shared `/edge` path, while node-specific verification routes are exposed under `/edge-nodes/<node-id>`. |
| `SESSION_SECRET` | `northstar-demo-session-secret` | HMAC key for session cookies |

## Build

```bash
npm run build       # Next.js production build
make build-go       # Go binary
make build-rust     # Rust binary
make build          # All Docker images
```

## Testing

```bash
make test           # All tests

npm test            # Vitest (component + service tests)
make test-go        # Go tests
make test-rust      # Rust tests
```

## Project Structure

```
app/                  Next.js pages and API route proxies
components/           React components (auth, demo UI)
lib/                  Session management, service client, types
services/             TypeScript service logic (used in tests)
api-go/               Go control-plane API
  cmd/server/         Entry point
  internal/           Handlers, state store, analytics, rate limiting
  migrations/         PostgreSQL schema
edge-rust/            Rust edge service
  src/                Request evaluation, caching, WAF, proxy
nginx/                Ingress configuration
clickhouse/init/      ClickHouse schema
tests/demo/           Vitest test suite
docs/demo/            Demo documentation and runbooks
```

## API Overview

### Go API (control plane)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET/POST | `/domains` | List or create domains |
| GET/PATCH/POST | `/domains/{id}` | Get, update, or run actions on a domain |
| POST | `/policy` | Publish cache policy |
| DELETE | `/policy` | Rollback to baseline |
| GET | `/logs` | Query service logs |
| GET | `/analytics` | Analytics summary and quota |
| GET | `/proofs` | Request proof events |
| POST | `/reset` | Reset all state (requires `X-Internal-Token`) |

### Rust Edge

| Method | Path | Description |
|--------|------|-------------|
| POST | `/request` | Evaluate a request (returns proof JSON) |
| GET | `/proxy/{path}` | Proxy public origin content with edge headers |
| POST | `/reset` | Clear file-based cache |

## Documentation

See `docs/demo/` for runtime guides and reference docs:

- [Demo Script](docs/demo/demo-script.md) — scripted end-to-end walkthrough
- [Service Map](docs/demo/service-map.md) — architecture and request flow
- [Runbook](docs/demo/runbook.md) — operational procedures
- [Reset & Reseed](docs/demo/reset-and-reseed.md) — demo state management
- [Claims Guardrails](docs/demo/demo-claims-guardrails.md) — what to claim vs. not
- [Logs & Evidence Guide](docs/demo/logs-and-evidence-guide.md) — log interpretation
- [Readiness Checklist](docs/demo/presentation-readiness-checklist.md) — pre-demo checks
