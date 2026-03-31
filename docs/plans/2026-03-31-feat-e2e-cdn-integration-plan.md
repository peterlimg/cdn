---
title: "feat: E2E CDN Integration via Redis Streams and Outbox Pattern"
type: feat
date: 2026-03-31
---

# feat: E2E CDN Integration via Redis Streams and Outbox Pattern

## Overview

Complete the end-to-end integration of the CDN architecture. The Next.js dashboard manages configuration via the Go API (Control Plane). The Go API persists state in PostgreSQL and pushes updates to the Rust proxy (Data Plane/Edge) via Redis Streams using the Transactional Outbox pattern. The Rust edge applies these configurations in memory using the `arc-swap` crate (Read-Copy-Update pattern) to evaluate incoming requests lock-free. Finally, the Rust edge streams access logs back to the Go API via Redis for the analytics dashboard.

## Problem Statement

Currently, the Rust edge fetches configuration synchronously from the Go API or operates on hardcoded state. To act as a true CDN:
1. Configuration updates (like WAF blocks or Cache invalidations) must propagate to all edge nodes globally in near real-time (<50ms).
2. The edge must evaluate requests against this configuration without blocking or lock contention (`RwLock` is too slow for sub-millisecond throughput).
3. The system must not lose configuration updates if an edge node restarts, or if the Go API crashes immediately after writing to Postgres.

## Proposed Solution

1. **Transactional Outbox (Go)**: The Go API writes domain/policy changes to Postgres and an `outbox_events` table in the same transaction. A worker using `LISTEN/NOTIFY` immediately publishes these events to a Redis Stream (`cdn:config:events`).
2. **Broadcast Redis Streams (Rust)**: Edge nodes consume `cdn:config:events` using `XREAD` to ensure every node receives every update (fan-out).
3. **Lock-free State (Rust)**: The Rust edge stores configuration in `Arc<ArcSwap<Config>>`. Background Tokio tasks update the pointer, while Axum request handlers read the pointer lock-free.
4. **Log Streaming**: The Rust edge pushes access logs to a separate Redis Stream (`cdn:access:logs`). The Go API consumes this using a Consumer Group to load-balance log insertion into the analytics database.
5. **Multi-Region Edge Deployment**: The local `docker-compose.yml` will be updated to spin up multiple distinct Rust edge instances (e.g., `edge-us-east`, `edge-eu-west`) to successfully prove that cache and WAF configuration broadcasts correctly to multiple geographically distributed nodes.

## Technical Approach

### Architecture

```mermaid
flowchart TD
    UI[Next.js Dashboard] -->|HTTP POST| GO[Go API]
    GO -->|TX COMMIT| PG[(PostgreSQL)]
    PG -->|LISTEN/NOTIFY| OUTBOX[Go Outbox Worker]
    OUTBOX -->|XADD| R_CONF[(Redis Stream: cdn:config:events)]
    
    R_CONF -->|XREAD (Broadcast)| RUST_BG[Rust Tokio Background Task]
    RUST_BG -->|store()| ARCSWAP[ArcSwap In-Memory State]
    
    USER[End User Request] -->|HTTP| RUST_AXUM[Rust Axum Handler]
    RUST_AXUM -->|load_full()| ARCSWAP
    RUST_AXUM -->|XADD| R_LOGS[(Redis Stream: cdn:access:logs)]
    
    R_LOGS -->|XREADGROUP| GO_LOGS[Go Log Consumer]
    GO_LOGS -->|Batch Insert| PG
```

### Solving the Broadcast Problem
We must **not** use Redis Consumer Groups for the configuration stream (`cdn:config:events`). Consumer Groups split messages among consumers (load balancing). For config updates, every edge node must receive the update.
- **Solution**: Each Rust node uses simple `XREAD` tracking its own `last_id` in memory.

### Solving the Cold Start Race Condition
If an edge node boots up, it must fetch the initial state without missing updates that happen during the fetch.
- **Solution**: The Go API's bulk sync endpoint (`/internal/config`) will return the current state **and** the latest Redis Stream `last_id` at the time of the query. The Rust edge initializes its `arc-swap` state and starts its `XREAD` loop strictly from that `last_id`.

### Log Streaming & Backpressure
If the logging backend goes down, the Rust edge could run out of memory buffering access logs.
- **Solution**: The Rust edge will use a bounded Tokio `mpsc::channel` (e.g., size 10,000) to send logs from the Axum handler to the Redis publishing task. If the channel is full, the handler uses `try_send()` and explicitly drops the log (incrementing a `logs_dropped` metric) to ensure user traffic is never blocked.

## Implementation Phases

### Phase 1: Go API Transactional Outbox
- Create a migration for the `outbox_events` table.
- Update `api-go/internal/db/client.go` to wrap domain/policy mutations in a transaction that inserts into `outbox_events`.
- Implement a background Go worker using `pgx` `LISTEN/NOTIFY` (fallback to polling every 5s) to read the outbox and `XADD` to `cdn:config:events`.
- Update the `/internal/config` endpoint to include `latest_stream_id`.

### Phase 2: Rust Edge `arc-swap` and Redis Subscriber
- Add `arc-swap`, `redis`, and `tokio-stream` to `edge-rust/Cargo.toml`.
- Update `docker-compose.yml` to inject `REDIS_URL` and instantiate multiple edge services (e.g., `edge-us-east:4002`, `edge-eu-west:4003`) to prove broadcast replication across different simulated regions.
- Refactor the Rust state to use `type SharedState = Arc<ArcSwap<EdgeConfig>>;`.
- Implement a background Tokio task that fetches the initial config, sets the `ArcSwap`, and enters a loop calling `XREAD` on `cdn:config:events` to dynamically update the state using `.store()`.
- Update Axum handlers to use `state.load_full()` to ensure borrow slots are not held across `.await` points.

### Phase 3: Access Log Streaming
- Implement the bounded `mpsc::channel` in Rust for access logs.
- Implement a secondary Tokio task in Rust that receives logs from the channel and uses `XADD` to `cdn:access:logs`.
- Implement a Go API worker that uses a Redis Consumer Group to process `cdn:access:logs` and batch insert them into the Postgres analytics tables.

## Acceptance Criteria

### Functional
- [ ] Updating a domain's cache rule in the dashboard propagates to all simulated edge nodes (e.g., US and EU instances) without restarting the services.
- [ ] The multiple Rust Edge nodes correctly route traffic based on the dynamically updated configuration independently.
- [ ] Access logs appear in the dashboard analytics within 5 seconds of a request hitting any of the edge instances.

### Non-Functional
- [ ] **Performance**: The Rust Edge hot path does not use `RwLock` or Mutexes for configuration reads.
- [ ] **Reliability**: If the Rust edge disconnects from Redis and reconnects, it processes all missed config updates using its last known `last_id`.
- [ ] **Resilience**: If Redis is completely down, the Rust edge continues to serve traffic using its last known in-memory state.

## Dependencies & Prerequisites
- Redis 7+ must be available to both `api-go` and `edge-rust`.
- The `api-go` service requires `pgx` for PostgreSQL `LISTEN/NOTIFY` support.

## References & Research
- Redis Streams vs Pub/Sub for broadcast: `XREAD` is required for fan-out without Consumer Groups.
- `arc-swap` RCU pattern: `load_full()` must be used if the state is held across `.await` points to avoid exhausting thread-local borrow slots.
- Transactional Outbox: `LISTEN/NOTIFY` provides near-instant triggers but requires a polling fallback to guarantee at-least-once delivery if the Go worker crashes.