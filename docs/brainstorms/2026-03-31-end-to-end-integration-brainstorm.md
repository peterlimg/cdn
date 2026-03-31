---
date: 2026-03-31
topic: end-to-end-integration
---

# E2E CDN Integration via Redis Streams

## What We're Building

We are completing the end-to-end integration of the CDN architecture defined in the project plans. The Next.js dashboard will manage configuration via the Go API (Control Plane). The Go API will persist this state in PostgreSQL and push updates to the Rust proxy (Data Plane/Edge) via Redis Streams. The Rust edge will apply these configurations in memory to evaluate incoming requests (cache hits/misses, WAF blocks), fetch from the origin when necessary, and stream access logs back for the analytics dashboard.

## Why This Approach

The Redis Streams approach was chosen because it closely mimics the near-instant configuration propagation of production CDNs (like Fastly or Cloudflare) while providing message persistence and consumer groups to prevent data loss during edge node restarts or network blips. It completely decouples the request serving path from database latency: the Rust edge evaluates requests against in-memory state, ensuring massive throughput and sub-millisecond latency.

## Key Decisions

- **State Authority:** The Go API is the strict authority over configuration. It writes to PostgreSQL first and uses the Transactional Outbox pattern (or Postgres logical replication via LISTEN/NOTIFY) to guarantee at-least-once delivery to Redis, preventing dual-write data loss vulnerabilities.
- **Config Propagation:** The Go API will publish domain and policy changes to a Redis Stream (e.g., `cdn:config:events`).
- **Edge Architecture:** The Rust edge will run a background Tokio task to consume the Redis Stream. Incoming messages will update an atomic, lock-free in-memory cache using the `arc-swap` crate (Read-Copy-Update pattern) to avoid read-path contention and maintain sub-millisecond latency.
- **Initial Sync (Cold Start):** When the Rust edge boots, it must fetch the entire current configuration state (either via a bulk GET from Redis or an HTTP call to an internal Go endpoint) before it resumes processing the Stream from its last known consumer group ID.
- **Evidence/Observability:** The Rust edge will produce structured logs for every request (including Cache Status, WAF outcome, and Request/Trace IDs) and stream them back to the Go API or Redis so they appear on the Next.js Evidence panels.

## Open Questions

- Should the Rust edge push access logs back to Go via HTTP, or push them into a Redis Stream/List that Go consumes asynchronously?
- How complex do we need the initial sync protocol to be to avoid race conditions between the bulk load and the first Pub/Sub message?

## Next Steps
→ Run `/workflows:plan` for implementation details.