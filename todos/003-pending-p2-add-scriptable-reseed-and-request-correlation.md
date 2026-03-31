---
status: completed
priority: p2
issue_id: "003"
tags: [code-review, automation, observability, demo-flow]
dependencies: []
---

# Add scriptable reseed and request correlation

## Problem Statement

The reset flow is closer to deterministic now, but reseeding and Go-side request correlation are still weaker than the rest of the demo. Agents and operators need a clean scripted baseline and full request correlation across proof and logs.

## Findings

- `app/domains/new/page.tsx:5-15` still creates domains through a side-effectful GET redirect rather than a clean scriptable setup primitive.
- `lib/demo/service-client.ts:42-50` exposes a create-domain API path that is not available directly when only ingress is published.
- `api-go/internal/state/store.go:238` logs `config.lookup` with a synthetic request id rather than the active request id, so Go participation is not fully correlated in request-scoped views.
- `docs/demo/reset-and-reseed.md` still relies on UI actions rather than a clean reseed primitive.

## Proposed Solutions

### Option 1: Add a protected reseed endpoint and thread request id into edge-context lookup

**Approach:** Add a single demo-internal reseed path and include request id in Go edge-context logging.

**Pros:**
- Improves deterministic automation
- Preserves current UI
- Closes the request-correlation gap

**Cons:**
- Adds another internal endpoint
- Needs careful documentation

**Effort:** 2-4 hours

**Risk:** Low

---

### Option 2: Make onboarding fully POST-driven and remove side-effectful GET creation

**Approach:** Replace the current `/domains/new` auto-create behavior with a proper form/API-driven onboarding step and align reseed with that flow.

**Pros:**
- Better product shape
- Cleaner automation surface long term

**Cons:**
- Larger UX change
- More scope than needed for the immediate review fix

**Effort:** 4-6 hours

**Risk:** Medium

## Recommended Action

Add a protected scriptable reseed endpoint and thread the active request ID through Go edge-context lookup logging so the same request can be correlated across ingress, Rust proof, and Go logs.

## Technical Details

**Affected files:**
- `app/domains/new/page.tsx`
- `lib/demo/service-client.ts`
- `api-go/internal/state/store.go`
- `docs/demo/reset-and-reseed.md`

## Resources

- **Plan:** `docs/plans/2026-03-31-feat-stack-aligned-cdn-prototype-evolution-plan.md`
- **Review source:** local branch review on `master`

## Acceptance Criteria

- [x] A reset + reseed baseline can be executed non-interactively
- [x] Go logs can be correlated to the same request id shown in edge proof where applicable
- [x] Demo docs describe the supported scriptable baseline path accurately

## Work Log

### 2026-03-31 - Initial Review Finding

**By:** Claude Code

**Actions:**
- Reviewed reset/reseed docs against current routes and service APIs
- Checked request-correlation behavior in Go state logging
- Identified remaining automation and observability gaps

**Learnings:**
- Demo automation quality depends on small internal primitives, not only UI polish

### 2026-03-31 - Resolved

**By:** Claude Code

**Actions:**
- Added `POST /api/reseed` for non-interactive demo baseline creation
- Updated reset/reseed docs and runbook with the scripted flow
- Threaded the active request ID from ingress into Rust evaluation and Go `config.lookup` logging

**Verification:**
- `go build ./...`
- `cargo check`
- `npm test`
- `npm run build`
- Focused correctness re-review returned no findings
