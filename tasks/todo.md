# Task Checklist

- [completed] Research repo surfaces for real user CDN onboarding/setup planning.
- [completed] Inspect current domain models, onboarding UX, proof flow, origin route, policy publishing, and analytics/log surfaces.
- [completed] Summarize repo-grounded guidance and reference file paths for a new plan.

- [completed] Fix remaining Unit 5 precedence mismatch in Rust edge request flow.
- [completed] Remove unsafe ClickHouse replay/backfill path and keep analytics honesty under degradation.
- [completed] Re-run focused verification for Go, Rust, and app tests/build.
- [completed] Update plan review notes and checklist state for the completed fixes.
- [completed] Verify full Docker Compose startup and fix container-specific edge issues.

# Lessons

- When the user asks for a real end-user onboarding/setup flow, do not stay anchored on the existing demo proof-loop framing. Rewrite the plan around the user journey directly instead of repeatedly qualifying it through demo constraints.

# Review

- Repo research confirmed the app already has the right spine for a real onboarding flow: domain creation, a domain detail workspace, policy revision publishing, request proof, service logs, and analytics summaries.
- The best extension path is to enrich the shared `DomainRecord` lifecycle and reuse the existing `app/domains/new` -> `app/domains/[domainId]` flow rather than inventing a parallel onboarding system.
- Demo framing exists mainly in copy and a few fields like `truthLabel`, `readinessNote`, and the hard-coded demo route hint, while the underlying control-plane and evidence seams are reusable.
- Rust now evaluates `pending -> WAF -> rate limit -> quota -> cache/origin`, matching the documented request precedence.
- Go no longer attempts ClickHouse replay from local events, which removes the append-only duplicate-event risk during analytics recovery.
- ClickHouse degradation now stays explicit: failed analytics ingest falls back to local summaries with degraded freshness until reset/reseed restores trust.
- Verification passed with `cargo test`, `go test ./...`, `go build ./...`, `npm test`, `npm run build`, and `docker compose config`.
- Full `docker compose up -d --build` verification now passes after switching the Rust image path to `rustls` TLS and updating the Axum wildcard proxy route to `/{*path}`.
