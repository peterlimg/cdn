<div align="center">
  <h1>Unseen CDN</h1>
  <p><strong>CDN control plane and edge runtime built with Rust, Go, and TypeScript.</strong></p>
  <p>
    Domain onboarding, DNS verification flow, origin health checks, cache policy revisions,
    edge request evaluation, WAF behavior, quota enforcement, analytics, logs, request proofs,
    and multi-edge deployment topology.
  </p>
</div>

<div align="center">
  <a href="docs/demo/demo-script.md"><strong>Demo Script</strong></a> ·
  <a href="docs/demo/service-map.md"><strong>Service Map</strong></a> ·
  <a href="docs/demo/runbook.md"><strong>Runbook</strong></a> ·
  <a href="docs/demo/logs-and-evidence-guide.md"><strong>Logs & Evidence</strong></a> ·
  <a href="https://www.loom.com/share/10feee78bdef4a4499c15a8e79b2aefa"><strong>Watch Video</strong></a>
</div>

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/Rust-Edge_Runtime-black?logo=rust" alt="Rust edge runtime" />
  <img src="https://img.shields.io/badge/Go-Control_Plane-00ADD8?logo=go&logoColor=white" alt="Go control plane" />
  <img src="https://img.shields.io/badge/TypeScript-Next.js_UI-3178C6?logo=typescript&logoColor=white" alt="TypeScript Next.js UI" />
  <img src="https://img.shields.io/badge/PostgreSQL-Durable_State-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL durable state" />
  <img src="https://img.shields.io/badge/Redis-Rate_Limits_&_Counters-DC382D?logo=redis&logoColor=white" alt="Redis counters and rate limits" />
  <img src="https://img.shields.io/badge/ClickHouse-Analytics-FFCC01?logo=clickhouse&logoColor=black" alt="ClickHouse analytics" />
  <img src="https://img.shields.io/badge/Docker_Compose-Local_Stack-2496ED?logo=docker&logoColor=white" alt="Docker Compose local stack" />
  <img src="https://img.shields.io/badge/Edge_Nodes-3_Regions-6F42C1" alt="3 edge nodes" />
</p>

<p align="center">
  <a href="https://www.loom.com/share/10feee78bdef4a4499c15a8e79b2aefa">
    <img src="docs/assets/unseen-hero.jpg" alt="Unseen CDN walkthrough video" width="100%" />
  </a>
</p>

<p align="center">
  <a href="https://www.loom.com/share/10feee78bdef4a4499c15a8e79b2aefa"><strong>Watch the overview video</strong></a>
</p>

Unseen CDN is a working CDN platform prototype with clear separation between the control plane, edge runtime, analytics pipeline, and operator dashboard.

The platform combines:
- Rust for edge request handling, cache behavior, and WAF-style filtering
- Go for control plane APIs, domain state, policy management, and traffic coordination
- TypeScript / Next.js for the dashboard and operator-facing interface
- PostgreSQL, Redis, and ClickHouse for durable state, counters, and analytics
- Nginx and Docker Compose for ingress and multi-service orchestration

It is designed around core CDN workflows: onboarding domains, validating origin setup, publishing cache behavior, evaluating requests at the edge, enforcing limits, and exposing evidence through logs, analytics, and request proofs.

## ✨ Current Capabilities

- Sign in to the dashboard
- Create and manage domains / zones
- Configure origins and run health checks
- Model and verify DNS setup flow
- Publish cache policy revisions
- Route requests through the edge runtime
- Observe cache transitions from BYPASS to MISS to HIT
- Apply basic WAF blocking on suspicious request paths
- Enforce Redis-backed rate limits
- Enforce quota limits at the request path
- Review analytics, structured logs, and request proof events
- Simulate multi-edge rollout across 3 edge nodes

## 🏗 Architecture

Three-service runtime:

| Service | Language | Port | Role |
|---------|----------|------|------|
| UI | TypeScript / Next.js 16 | 3000 | Dashboard, API proxy layer |
| API | Go 1.22 | 4001 | Control plane, persistence, rate limiting |
| Edge | Rust (axum 0.8) | 4002 | Request evaluation, file-based caching, WAF |

Supporting infrastructure: PostgreSQL 17, Redis 7, ClickHouse 25.3, Nginx 1.27.

```text
Requester → Nginx (:8080)
             ├── /edge/*  → Rust edge
             └── /*       → Next.js UI → Go API
```

### Service Responsibilities

Rust
- edge request pipeline
- cache lookup and cache store behavior
- WAF-style request filtering
- request evaluation and proof generation
- origin fetch path for eligible traffic

Go
- control plane APIs
- domain and origin state
- policy publication and revision tracking
- internal edge coordination
- quota and analytics summary APIs

TypeScript / Next.js
- dashboard
- onboarding UI
- operator workflows
- proof / log / analytics views

PostgreSQL
- durable control-plane state

Redis
- counters
- rate-limit state
- short-lived coordination data

ClickHouse
- analytics and event storage

Nginx
- ingress / proxy layer

## 🌍 Multi-Edge Topology

The local stack includes 3 named edge nodes:
- US East
- EU West
- AP South

This allows the system to demonstrate early regional rollout patterns and edge-targeted behavior across multiple runtimes.

## 🚦 Request Outcomes

Unseen CDN currently surfaces request outcomes including:
- `BYPASS`
- `MISS`
- `HIT`
- `BLOCKED_PENDING`
- `BLOCKED_WAF`
- `BLOCKED_RATE_LIMIT`
- `BLOCKED_QUOTA`
- `ORIGIN_ERROR`

These outcomes are reflected through proof events, logs, and analytics.

## 🎬 Demo Flow

A typical end-to-end flow looks like this:

1. Create a domain
2. Configure the origin
3. Verify setup state
4. Publish a cache policy revision
5. Send traffic through the edge runtime
6. Observe MISS on the first request and HIT on repeated requests
7. Review proofs, logs, and analytics
8. Continue traffic until quota is reached and confirm blocking behavior

For a guided run sequence, see `docs/demo/demo-script.md`.

## 🧭 Scope Boundary

Unseen CDN is a working CDN prototype with a defined scope. It currently focuses on core CDN workflows and public traffic delivery patterns.

Supported now:
- public/static origins behind the CDN
- hostname-to-origin routing
- Rust edge cache behavior for public traffic
- proof, logs, and analytics for the public request path
- operator login to the dashboard

Not safely supported yet:
- authenticated sites whose origin behavior depends on end-user login or credentials
- authenticated app traffic using `Cookie`, `Authorization`, or other request credentials
- login/logout/session-establishing flows that depend on response headers like `Set-Cookie`
- personalized or private responses that must never be shared through edge cache
- general dynamic application traffic that requires full request/response passthrough

Current support is strongest around core CDN behavior, request handling, and operational visibility rather than full authenticated application delivery.

## 🛠 Tech Stack

- Rust
- Go
- TypeScript / Next.js
- Nginx
- PostgreSQL
- Redis
- ClickHouse
- Docker Compose

## 📦 Quick Start (Docker Compose)

Prerequisites:
- Node.js 22+
- Go 1.22+
- Rust (stable)
- Docker and Docker Compose

Start the full local stack:

```bash
make up
```

Open `http://localhost:8080`.

Default tokens are set in the Makefile:
- `DEMO_RESET_TOKEN=***`
- `INTERNAL_API_TOKEN=***`

## 💻 Local Development

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

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INTERNAL_API_TOKEN` | `demo-internal-token` | Inter-service auth token |
| `DEMO_RESET_TOKEN` | `demo-reset` | Auth token for reset/reseed routes |
| `DATABASE_URL` | `postgres://postgres:***@127.0.0.1:5433/cdn_demo?sslmode=disable` | PostgreSQL connection |
| `REDIS_URL` | `redis://127.0.0.1:6381/0` | Redis connection |
| `CLICKHOUSE_URL` | *(empty = disabled)* | ClickHouse connection (analytics degrade gracefully without it) |
| `CLICKHOUSE_USER` | `default` | ClickHouse HTTP username |
| `CLICKHOUSE_PASSWORD` | `demo-clickhouse` | ClickHouse HTTP password for local compose |
| `GO_API_URL` | `http://127.0.0.1:4001` | Go API base URL |
| `RUST_EDGE_URL` | `http://127.0.0.1:4002` | Generic Rust edge base URL. Through Docker this points at Nginx's shared `/edge` path, while node-specific verification routes are exposed under `/edge-nodes/<node-id>`. |
| `SESSION_SECRET` | `unseen-demo-session-secret` | HMAC key for session cookies |

## 🔨 Build

```bash
npm run build       # Next.js production build
make build-go       # Go binary
make build-rust     # Rust binary
make build          # All Docker images
```

## 🧪 Testing

```bash
make test           # All tests
npm test            # Vitest (component + service tests)
make test-go        # Go tests
make test-rust      # Rust tests
```

## 📁 Project Structure

```text
app/                  Next.js pages and API route proxies
components/           React components
lib/                  Session management, service client, types
services/             TypeScript service logic
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

## 🔌 API Overview

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

## 📚 Documentation

See `docs/demo/` for runtime guides and reference docs:

- [Demo Script](docs/demo/demo-script.md) — scripted end-to-end walkthrough
- [Service Map](docs/demo/service-map.md) — architecture and request flow
- [Runbook](docs/demo/runbook.md) — operational procedures
- [Reset & Reseed](docs/demo/reset-and-reseed.md) — demo state management
- [Claims Guardrails](docs/demo/demo-claims-guardrails.md) — what to claim vs. not
- [Logs & Evidence Guide](docs/demo/logs-and-evidence-guide.md) — log interpretation
- [Readiness Checklist](docs/demo/presentation-readiness-checklist.md) — pre-demo checks

## Summary

Unseen CDN brings together edge request handling, control-plane APIs, analytics, and dashboard workflows in a single multi-service CDN platform prototype. It demonstrates the core mechanics of domain onboarding, cache behavior, traffic enforcement, operational visibility, and phased edge rollout in a stack built with Rust, Go, and TypeScript.
