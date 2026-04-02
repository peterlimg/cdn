---
title: "fix: Resolve Sticky ClickHouse Degraded State"
type: fix
status: active
date: 2026-04-01
---

# fix: Resolve Sticky ClickHouse Degraded State

## Overview

The analytics UI can tell the user `ClickHouse-backed analytics are currently unavailable` even when ClickHouse itself is healthy and the Go API health endpoint is green. The root cause is a sticky in-memory degraded flag inside the Go store that latches after a ClickHouse insert or query failure and short-circuits future ClickHouse summary reads until reset or process restart.

This plan fixes the mismatch between real service health and buyer-facing analytics freshness while preserving the repo's evidence hierarchy: request proof and service logs stay immediate truth, analytics stay derived confirmation.

## Problem Statement

The current behavior creates a false operational story:

- `api-go/internal/state/store.go:622-625` marks `analyticsFreshness = "degraded"` when a ClickHouse insert fails.
- `api-go/internal/state/store.go:717-723` then bypasses `QuerySummary` entirely whenever that local flag is degraded, returning only local PostgreSQL-backed summaries.
- `api-go/internal/state/store.go:747-748` also flips the same flag on ClickHouse query failure.
- `api-go/internal/state/store.go:55-76` only clears the flag during reset.
- `api-go/internal/http/handlers.go:60-77` reports `/health` as `{"status":"ok"}` whenever `AnalyticsHealthy()` succeeds, even if the analytics endpoints are still latched into degraded fallback.
- `components/demo/analytics-page-shell.tsx:17-23` renders the degraded banner directly from `summary.freshness`.

That means one transient failure can leave the app saying ClickHouse is unavailable long after ClickHouse recovered. In this repo, that is especially confusing because the docs intentionally teach the user to trust proof/logs first, but the current UI copy does not distinguish between:

1. ClickHouse actually being down now.
2. Analytics being in a guarded fallback state after an earlier failure.

## Goals

1. Identify and correct the specific root cause behind the stale degraded state.
2. Keep analytics honesty: no silent promotion to `live` if the system cannot trust the summary.
3. Remove the mismatch where `/health` says OK while analytics surfaces imply current ClickHouse unavailability.
4. Preserve the repo's established truth boundary: proof and logs first, analytics second.
5. Add tests that lock the behavior down.

## Non-Goals

1. Reintroducing any replay/backfill path from local events into ClickHouse.
2. Reframing analytics as authoritative for request truth.
3. Expanding the analytics schema or redesigning the full analytics page.
4. Changing reset/reseed semantics beyond what is required for correct recovery behavior.

## Root Cause Summary

### Confirmed From Repo Code

- The store keeps a single process-local `analyticsFreshness` latch in `api-go/internal/state/store.go:27-32`.
- After any ingest failure, `IngestEdgeEvent()` sets that latch to `degraded` in `api-go/internal/state/store.go:604-625`.
- Once degraded, `Analytics()` does not even attempt `QuerySummary()` and immediately returns local fallback data in `api-go/internal/state/store.go:715-723`.
- The only built-in recovery path is `Reset()`, which resets the latch in `api-go/internal/state/store.go:55-76`.
- The existing test `TestAnalyticsFallsBackToLocalSummaryAfterInsertFailure` in `api-go/internal/state/store_test.go:45-109` proves this sticky fallback is intentional today.

### Why This Produces the User-Facing Bug

- ClickHouse can recover.
- `/health` can return OK because `AnalyticsHealthy()` only pings ClickHouse directly.
- The analytics endpoints can still return `freshness: degraded` because they trust the local latch more than current ClickHouse availability.
- The UI copy then overstates the current condition as active ClickHouse unavailability.

## Scope Boundaries

- Primary implementation surface: `api-go/internal/state/store.go`
- Required validation surface: `api-go/internal/state/store_test.go`
- Possible API/contract surface: `services/shared/src/types.ts`, `components/demo/analytics-page-shell.tsx`, `app/analytics/page.tsx`
- Secondary docs if behavior changes materially: `docs/demo/logs-and-evidence-guide.md`, `docs/demo/presentation-readiness-checklist.md`, `docs/demo/reset-and-reseed.md`

## Context & Research

### Relevant Code and Patterns

- `api-go/internal/state/store.go:604-627`: insert failure marks analytics degraded.
- `api-go/internal/state/store.go:715-756`: analytics summary path and fallback control flow.
- `api-go/internal/state/store.go:759-763`: local degraded state overrides ClickHouse freshness.
- `api-go/internal/http/handlers.go:60-77`: health endpoint treats ClickHouse health separately from summary fallback state.
- `api-go/internal/http/handlers.go:252-255`: analytics endpoint returns the store summary directly.
- `api-go/internal/state/store_test.go:45-109`: current sticky degraded behavior is explicitly tested.
- `components/demo/analytics-page-shell.tsx:11-23`: UI copy for `updating` and `degraded`.
- `app/analytics/page.tsx:27-29`: page-level explanation of `Updating` vs `Degraded`.
- `services/shared/src/types.ts:105-119`: current analytics summary contract only exposes `freshness`.

### Repo-Local Learnings

- `docs/demo/logs-and-evidence-guide.md:20-29`: analytics are buyer-readable confirmation, not first-response debugging.
- `docs/demo/presentation-readiness-checklist.md:9-13`: keep the narrative anchored on `config -> proof -> logs -> analytics`.
- `docs/plans/2026-03-31-feat-stack-aligned-cdn-prototype-evolution-plan.md:534-540`: degraded analytics were intentionally made explicit, and recovery via reset/reseed was preferred after replay risks were removed.
- `docs/demo/reset-and-reseed.md:20-30`: reset is the explicit trust-restoration path today.
- `tasks/todo.md:32-33`: prior repo work intentionally removed unsafe ClickHouse replay and kept degradation explicit.

### Research Decision

External research is not needed for this planning pass. The bug is fully explained by local code, local docs, and the repo's own existing decisions around trust and recovery.

## Spec Flow

### Primary User Flow

1. A transient ClickHouse write or read failure occurs.
2. The store marks analytics degraded.
3. ClickHouse later becomes healthy again.
4. The operator opens `/analytics` or a domain detail page.
5. The system should present a state that matches reality and trust boundaries.

### Gaps In Current Flow

1. No recovery path exists between `degraded` and `reset`.
2. Health reporting and analytics freshness are derived from different definitions of health.
3. The UI cannot distinguish current outage from guarded fallback after prior failure.

### Edge Cases To Cover

1. Insert fails once, then ClickHouse queries succeed on the next read.
2. Query fails once, then succeeds on the next read.
3. ClickHouse is healthy but empty, so freshness should still be `updating`, not `degraded`.
4. ClickHouse remains unhealthy, so degraded fallback must remain explicit.
5. Domain-scoped analytics and global analytics should recover consistently.

## Proposed Solution

Treat the current sticky degraded latch as the root cause and replace it with recovery-aware behavior that still preserves trust.

The plan should evaluate these two repo-consistent options and implement the smaller correct one:

### Option A: Recovery-Aware Retry From `degraded`

- Keep `degraded` as the immediate result of ClickHouse failure.
- Allow `Analytics()` to retry `QuerySummary()` even when local freshness is degraded.
- Promote from `degraded` only after a successful ClickHouse summary read proves recovery.
- If retry fails, keep returning fallback local summaries with degraded freshness.

Why this is likely the best fix:

- It resolves the false degraded banner after transient outages.
- It preserves guarded fallback semantics.
- It requires the smallest behavioral change in the current store design.

### Option B: Preserve Sticky Degraded But Make It Explicitly "Recovery Pending"

- Keep the sticky degraded latch until reset/reseed.
- Change the health endpoint and UI copy to say analytics are in guarded fallback after a prior ClickHouse failure, not necessarily unavailable right now.
- Possibly expose extra summary metadata so the UI can differentiate `degraded_current` from `degraded_recovering`.

Why this is less attractive:

- It keeps the operational mismatch intact.
- It increases contract/UI complexity to explain a local state-machine artifact.

## Preferred Direction

Proceed with **Option A** unless implementation proves that a successful summary query is not sufficient to restore trust.

Reasoning:

- The existing repo already trusts successful `QuerySummary()` enough to mark the store `live` in `api-go/internal/state/store.go:727-730`.
- The current bug comes from the early return at `api-go/internal/state/store.go:717-723`, not from any deeper schema or consistency issue.
- This is the smallest fix that aligns user-visible analytics state with actual backend recovery.

## Implementation Units

- [x] **Unit 0: Make the recovery model explicit in the store**

**Goal:** Decide and document the state transition rules for `live`, `updating`, and `degraded` in `api-go/internal/state/store.go` before editing logic.

**Files:**
- `api-go/internal/state/store.go`
- `api-go/internal/state/store_test.go`

**Success criteria:**
- There is one clear rule for when the store may exit degraded state.
- The rule is based on trusted evidence, not optimistic health checks alone.

- [x] **Unit 1: Remove the false-sticky fallback path**

**Goal:** Ensure `Analytics()` can attempt ClickHouse recovery after earlier failures.

**Files:**
- `api-go/internal/state/store.go`

**Success criteria:**
- A prior insert failure no longer permanently suppresses future `QuerySummary()` attempts.
- Successful ClickHouse reads can restore non-degraded freshness.
- Persistent failures still return local fallback summaries safely.

- [x] **Unit 2: Align health/reporting semantics**

**Goal:** Remove or intentionally explain the mismatch between `/health` and analytics freshness.

**Files:**
- `api-go/internal/http/handlers.go`
- `api-go/internal/state/store.go`

**Success criteria:**
- Either `/health` incorporates the relevant analytics recovery signal, or the API exposes a clearer distinction that the UI can use.
- Operators are not told that ClickHouse is unavailable when only the local analytics path is guarded.

- [x] **Unit 3: Tighten UI copy only if needed**

**Goal:** Keep buyer-facing wording accurate after the backend change.

**Files:**
- `components/demo/analytics-page-shell.tsx`
- `app/analytics/page.tsx`
- `services/shared/src/types.ts`

**Success criteria:**
- The UI wording matches the new backend semantics.
- Proof/log primacy remains explicit.
- No extra UI state is added unless the backend really needs it.

- [x] **Unit 4: Add regression tests for recovery and mismatch cases**

**Goal:** Prevent regressions in degraded-state handling.

**Files:**
- `api-go/internal/state/store_test.go`
- `api-go/internal/http/handlers_test.go` or a new focused test file if needed

**Success criteria:**
- Tests cover insert-failure recovery.
- Tests cover query-failure recovery.
- Tests cover continuing degraded fallback when ClickHouse remains broken.
- Tests cover any changed `/health` semantics.

## Acceptance Criteria

### Functional Requirements

- [ ] After a transient ClickHouse failure, the analytics path can recover without requiring full reset or process restart.
- [ ] The analytics summary does not remain `degraded` purely because of a stale in-memory latch.
- [ ] When ClickHouse is truly unavailable, analytics still fall back locally and remain explicit about degraded freshness.
- [ ] The UI wording matches the actual runtime condition.

### Quality Gates

- [ ] `api-go` tests cover the recovery state machine and the persistent-failure path.
- [ ] No replay/backfill path is added.
- [ ] Request proof and service logs remain the primary truth surfaces in docs and UI copy.

## Risks and Mitigations

- Risk: automatically clearing degraded too aggressively could hide real analytics trust problems.
  Mitigation: only exit degraded after a successful ClickHouse summary read, not from a health ping alone.

- Risk: changing freshness semantics could drift from existing demo docs.
  Mitigation: update only the docs whose wording becomes inaccurate.

- Risk: domain-scoped and global summaries may recover differently.
  Mitigation: test both domain-filtered and unfiltered summary paths.

## Testing Strategy

- Add a store test where `InsertRequestEvent()` fails once, `QuerySummary()` later succeeds, and `Analytics()` returns recovered non-degraded data.
- Add a store test where `QuerySummary()` fails once, then succeeds on a later call.
- Keep the existing fallback test but update it so it verifies degraded behavior only while ClickHouse is still failing.
- Add handler-level coverage if `/health` behavior changes.

## Success Metrics

- Operators no longer see a degraded analytics banner after ClickHouse has recovered unless the system still lacks trusted summary data.
- The analytics API and health endpoint no longer present contradictory states for the same runtime condition.
- The repo preserves its honesty boundary around proof, logs, and analytics.

## Review

- Implemented a split degraded-state model in `api-go/internal/state/store.go`: ingest failures remain in guarded fallback because a missed append means ClickHouse can be healthy but incomplete, while query failures remain retryable and recover automatically on the next successful summary read.
- Added `AnalyticsWarning()` and updated `/health` in `api-go/internal/http/handlers.go` so the API can report guarded fallback honestly instead of always claiming ClickHouse is currently unavailable.
- Updated `components/demo/analytics-page-shell.tsx` copy so the degraded banner matches the actual runtime semantics.
- Added regression coverage in `api-go/internal/state/store_test.go` for retryable query recovery and guarded ingest fallback, plus `/health` warning coverage in `api-go/internal/http/handlers_test.go`.
- Runtime debugging against `docker compose logs` exposed a second root cause outside the store state machine: ClickHouse 25.3 in local compose requires password auth for the `default` user, and the analytics HTTP client was sending an unescaped insert query string. Fixed by adding authenticated ClickHouse requests in `api-go/internal/analytics/service.go`, URL-encoding the insert query parameter, and wiring matching `CLICKHOUSE_USER` / `CLICKHOUSE_PASSWORD` values through local compose.
- Added regression coverage in `api-go/internal/analytics/service_test.go` for authenticated health checks and encoded insert requests.
- Final runtime verification exposed the remaining active analytics failures: ClickHouse returned aggregate values as JSON strings over the HTTP interface, while the Go client decoded them as ints, and insert payloads were sending RFC3339 timestamps that did not match the `DateTime64(3, 'UTC')` JSONEachRow parser. Fixed by adding tolerant numeric decoding in `api-go/internal/analytics/service.go` and normalizing event timestamps to `YYYY-MM-DD HH:MM:SS.mmm` before insert.
- Added regression coverage in `api-go/internal/analytics/service_test.go` for string-encoded aggregate decoding and timestamp normalization.
- Runtime verification also exposed that Next.js app-route proxies for `/api/reset` and `/api/reseed` were effectively treating token config as unavailable in the production container path. Fixed by moving demo endpoint configuration behind runtime getter functions in `lib/demo/service-endpoints.ts` and restoring the documented repo-default token fallbacks so the app routes behave the same way as local compose and the Makefile defaults.
- Verification passed with `go test ./internal/analytics ./internal/state ./internal/http`, `npm test -- tests/demo/dashboard-flow.test.tsx`, `npm run build`, and `docker compose config`.
- Live compose verification passed with successful `POST /api/reset`, successful `POST /api/reseed`, and a post-reset dashboard snapshot showing one ready domain with zeroed events and `freshness: "live"`.
- Live local verification passed after restarting the current-source API on `:4001`: a request through `POST /api/request` to `https://peterlimg.github.io/peterlimg/` produced `freshness: "live"` in `/analytics` and `/dashboard` instead of the guarded degraded fallback.

## References

- `api-go/internal/state/store.go:55-76`
- `api-go/internal/state/store.go:604-627`
- `api-go/internal/state/store.go:715-763`
- `api-go/internal/http/handlers.go:60-77`
- `api-go/internal/http/handlers.go:252-255`
- `api-go/internal/state/store_test.go:45-109`
- `components/demo/analytics-page-shell.tsx:11-23`
- `app/analytics/page.tsx:27-29`
- `docs/demo/logs-and-evidence-guide.md:20-29`
- `docs/demo/presentation-readiness-checklist.md:9-13`
- `docs/demo/reset-and-reseed.md:20-30`
- `docs/plans/2026-03-31-feat-stack-aligned-cdn-prototype-evolution-plan.md:534-540`
