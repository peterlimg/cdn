---
status: completed
priority: p1
issue_id: "001"
tags: [code-review, reliability, demo-flow, rate-limiting]
dependencies: []
---

# Rate limit breaks quota demo flow

## Problem Statement

The documented demo flow says to continue sending requests until quota is reached, but the new Redis-backed rate limit blocks requests before quota can be exhausted. This breaks the primary walkthrough and makes the post-reset demo path non-deterministic.

## Findings

- `docs/demo/demo-script.md:14` and `docs/demo/runbook.md:46-57` still describe a quota-reached walkthrough.
- `api-go/internal/state/store.go:84` sets each domain rate limit to `3` requests per window.
- `edge-rust/src/request_flow.rs:137-159` applies `BLOCKED_RATE_LIMIT` before a user can accumulate enough served bytes to hit the `150000` byte quota.
- With `36018` bytes per served request, quota requires 5 served requests, which exceeds the current per-window rate limit.

## Proposed Solutions

### Option 1: Raise or disable rate limits for the default demo domain

**Approach:** Increase the default per-domain limit high enough that the quota walkthrough remains reachable.

**Pros:**
- Smallest change
- Keeps demo flow deterministic
- Avoids extra UI changes

**Cons:**
- Rate limiting becomes less visible in the default path
- Does not improve configurability

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Separate quota and rate-limit demo routes

**Approach:** Keep the current limit, but use a dedicated route or domain for quota walkthrough versus rate-limit walkthrough.

**Pros:**
- Preserves both capabilities visibly
- Clearer product storytelling

**Cons:**
- More UI and docs complexity
- More moving parts in rehearsals

**Effort:** 3-5 hours

**Risk:** Medium

## Recommended Action

Raised the default demo-domain rate limit above the quota walkthrough threshold and updated the runbook/demo script so quota remains the primary scripted block while rate limiting is still available as a separate burst test.

## Technical Details

**Affected files:**
- `api-go/internal/state/store.go`
- `edge-rust/src/request_flow.rs`
- `docs/demo/runbook.md`
- `docs/demo/demo-script.md`

## Resources

- **Plan:** `docs/plans/2026-03-31-feat-stack-aligned-cdn-prototype-evolution-plan.md`
- **Review source:** local branch review on `master`

## Acceptance Criteria

- [x] The documented quota walkthrough is achievable after reset
- [x] Rate-limit behavior remains testable and understandable
- [x] Runbook and demo script match real request behavior

## Work Log

### 2026-03-31 - Initial Review Finding

**By:** Claude Code

**Actions:**
- Reviewed current rate-limit and quota ordering
- Compared request byte size and quota threshold against configured limit
- Confirmed the walkthrough becomes blocked by rate limiting first

**Learnings:**
- Demo reliability depends on aligning enforcement thresholds with the scripted walkthrough

### 2026-03-31 - Resolved

**By:** Claude Code

**Actions:**
- Raised the default domain rate limit from the earlier low threshold to a quota-safe default
- Preserved rate-limit behavior as a separate burst demo path instead of the main walkthrough
- Updated runbook and demo script language to match the real enforcement order

**Verification:**
- `go build ./...`
- `cargo check`
- `npm test`
- `npm run build`
