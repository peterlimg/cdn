# Task Checklist

- [completed] Fix remaining Unit 5 precedence mismatch in Rust edge request flow.
- [completed] Remove unsafe ClickHouse replay/backfill path and keep analytics honesty under degradation.
- [completed] Re-run focused verification for Go, Rust, and app tests/build.
- [completed] Update plan review notes and checklist state for the completed fixes.
- [completed] Verify full Docker Compose startup and fix container-specific edge issues.

# Review

- Rust now evaluates `pending -> WAF -> rate limit -> quota -> cache/origin`, matching the documented request precedence.
- Go no longer attempts ClickHouse replay from local events, which removes the append-only duplicate-event risk during analytics recovery.
- ClickHouse degradation now stays explicit: failed analytics ingest falls back to local summaries with degraded freshness until reset/reseed restores trust.
- Verification passed with `cargo test`, `go test ./...`, `go build ./...`, `npm test`, `npm run build`, and `docker compose config`.
- Full `docker compose up -d --build` verification now passes after switching the Rust image path to `rustls` TLS and updating the Axum wildcard proxy route to `/{*path}`.
