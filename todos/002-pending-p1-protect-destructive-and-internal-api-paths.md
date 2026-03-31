---
status: completed
priority: p1
issue_id: "002"
tags: [code-review, security, api, reset, internal-endpoints]
dependencies: []
---

# Protect destructive and internal API paths

## Problem Statement

The Go API still exposes destructive and internal-only behavior too broadly. The reset path and internal ingest path need stronger trust boundaries and more reliable failure reporting.

## Findings

- `api-go/internal/http/handlers.go:170-181` still allows direct `POST /reset` without internal auth.
- `api-go/internal/http/handlers.go:197-210` accepts internal edge ingest protected only by a shared bearer-style header token.
- `api-go/internal/http/handlers.go:176-181` ignores Redis flush failure and still returns success.
- Current setup reduces host exposure, but direct access on the container network or leaked token still allows destructive or forged state changes.

## Proposed Solutions

### Option 1: Internal auth + strict error reporting

**Approach:** Require internal auth on reset, fail reset if Redis/Postgres clearing fails, and keep internal endpoints hidden behind shared token plus compose-network isolation.

**Pros:**
- Minimal change
- Closes obvious destructive access gap
- Aligns with demo-only trust model

**Cons:**
- Shared token still allows forgery if leaked
- Not production-grade service authentication

**Effort:** 2-4 hours

**Risk:** Medium

---

### Option 2: Signed ingest with nonce or server-side recomputation

**Approach:** Add request signing or derive ingestable state server-side instead of trusting caller payload.

**Pros:**
- Stronger authenticity guarantees
- Better long-term foundation

**Cons:**
- More implementation complexity
- Higher coordination cost across Go and Rust

**Effort:** 4-8 hours

**Risk:** Medium

## Recommended Action

Require internal auth on destructive/internal paths, fail reset when backing-store cleanup fails, and fail closed when internal auth is not configured. Keep the remaining trust model explicitly demo-internal and token-based.

## Technical Details

**Affected files:**
- `api-go/internal/http/handlers.go`
- `api-go/internal/state/store.go`
- `edge-rust/src/request_flow.rs`
- `app/api/reset/route.ts`

## Resources

- **Plan:** `docs/plans/2026-03-31-feat-stack-aligned-cdn-prototype-evolution-plan.md`
- **Review source:** local branch review on `master`

## Acceptance Criteria

- [x] Reset is not callable without internal authorization
- [x] Reset returns failure when backing-store cleanup fails
- [x] Internal ingest path has a documented trust boundary and stronger authenticity guarantees or explicit limitation

## Work Log

### 2026-03-31 - Initial Review Finding

**By:** Claude Code

**Actions:**
- Reviewed exposed internal endpoints and reset behavior
- Checked auth coverage and failure handling paths
- Identified remaining destructive and forgeable surfaces

**Learnings:**
- Demo infrastructure still needs explicit internal trust boundaries once persistence is introduced

### 2026-03-31 - Resolved

**By:** Claude Code

**Actions:**
- Added internal auth checks to Go reset and internal endpoints plus Rust cache reset
- Changed internal auth to fail closed when tokens are missing
- Propagated backend reset failures instead of returning success on partial cleanup
- Removed source-controlled token defaults from app code and Compose config
- Updated runbook/reset docs to require caller-provided demo tokens

**Verification:**
- `go build ./...`
- `cargo check`
- `npm test`
- `npm run build`
- Focused security re-review returned no findings
