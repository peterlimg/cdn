---
title: "feat: Add Multi-Edge Pull-Zone Targeting and Rollout Visibility"
type: feat
status: completed
date: 2026-04-01
---

# feat: Add Multi-Edge Pull-Zone Targeting and Rollout Visibility

## Overview

Add a real multi-edge topology to the local CDN demo and extend pull-zone creation so the user can see where a new zone will deploy before submitting it. New zones should default to all eligible edge nodes, with an advanced option to pin the zone to a subset. After creation, the zone detail view should show the intended deployment scope and the per-node rollout state without implying that one successful proof means every edge is already live.

This plan is a focused follow-up to `docs/plans/2026-03-31-feat-e2e-cdn-integration-plan.md` and `docs/plans/2026-04-01-001-feat-simplify-onboarding-flow-plan.md`. It reuses the existing Next.js -> Go -> Rust split and folds edge targeting into the simplified onboarding flow instead of creating a second operator-only workflow.

## Problem Frame

The current repo has two gaps relative to the requested feature:

- The local runtime only deploys one Rust edge service today (`docker-compose.yml`, `nginx/nginx.conf`), so there is no real notion of multiple edge nodes or rollout state.
- Pull-zone creation is intentionally minimal in `components/demo/new-domain-form.tsx`, but it has no concept of edge inventory, placement scope, or node selection.
- The current domain model only exposes global revision fields (`activeRevisionId`, `appliedRevisionId`), which cannot answer questions like "Which nodes will this zone run on?" or "Did the EU node apply the new revision yet?"
- Request proofs and logs do not carry node identity, so even after multiple edges exist the UI would overclaim if it treated one proof as global rollout evidence.
- The repo still assumes a single generic edge URL in multiple places (`docker-compose.yml`, `nginx/nginx.conf`, `lib/demo/service-endpoints.ts`, `app/api/request/route.ts`), so node-specific verification cannot be bolted on without clarifying what the default edge URL proves versus what a node-targeted route proves.

The feature therefore has to solve three things together:

1. A deployable multi-edge topology in the local/demo environment.
2. A persisted control-plane model for deployment intent (`all eligible` vs `selected subset`).
3. A user-facing rollout story that stays honest about what is configured, what is targeted, and what is actually applied.

## Requirements Trace

- R1. The local/demo stack must support more than one distinct edge node with stable identity.
- R2. The pull-zone create flow must show the eligible edge nodes that the new zone will target before submit.
- R3. New pull zones must default to all eligible edge nodes, with an advanced option to limit deployment to a subset.
- R4. Deployment intent and per-node rollout state must persist with the zone and remain visible after the create redirect.
- R5. The Go control plane, shared TS types, and Rust edge runtime must all understand node identity and placement scope.
- R6. The runtime rollout path must reuse the repo's existing direction toward broadcast config propagation, not invent a separate per-node mutation channel.
- R7. The new create-flow UI must preserve the simplified onboarding philosophy from `docs/plans/2026-04-01-001-feat-simplify-onboarding-flow-plan.md`: one dominant path, advanced selection as progressive disclosure.
- R8. The demo must not imply a production-ready global CDN footprint or that one successful proof from one edge means every target node is live.

## Scope Boundaries

- Non-goal: production-grade regional traffic steering, autoscaling, or POP management.
- Non-goal: making node selection mandatory during zone creation.
- Non-goal: redesigning the full onboarding flow beyond placement summary, advanced selection, and rollout visibility.
- Non-goal: introducing a separate provisioning service or operator dashboard for node inventory management.
- Non-goal: claiming public geo-routing parity before the runtime and ingress topology actually prove it.

## Context & Research

### Relevant Code and Patterns

- `app/domains/new/page.tsx`: authenticated server entry for the create flow.
- `components/demo/new-domain-form.tsx`: current minimal create form using client state and `useTransition`.
- `app/api/reseed/route.ts`: thin Next mutation proxy for zone creation.
- `lib/demo/service-client.ts`: current server-side read helpers and create/update helpers for Go API calls.
- `services/shared/src/types.ts`: shared TS domain types that drive UI contracts.
- `api-go/internal/http/handlers.go`: `POST /domains`, `GET /domains/:id`, and internal edge endpoints.
- `api-go/internal/state/store.go`: domain creation, persistence, edge context, and analytics/log ingestion.
- `api-go/internal/state/types.go`: Go-side domain and edge contract types.
- `docker-compose.yml`: current single-edge deployment topology.
- `nginx/nginx.conf`: current ingress, still pointing to one `edge` upstream.
- `edge-rust/src/request_flow.rs`: current edge context fetch, proof generation, and ingest back to Go.
- `components/demo/policy-revision-banner.tsx`: existing global apply-state banner that will need node-aware expansion.
- `components/demo/zone-detail-shell.tsx`: current zone detail orchestration point for setup, proof, analytics, and revision status.

### Institutional Learnings

- `docs/plans/2026-03-31-feat-e2e-cdn-integration-plan.md`: config updates should fan out to every edge via broadcast semantics, not consumer-group load balancing.
- `docs/plans/2026-04-01-001-feat-simplify-onboarding-flow-plan.md`: `/domains/new` should stay simple, and advanced operational options should use progressive disclosure.
- `docs/plans/2026-03-31-feat-real-user-cdn-onboarding-flow-plan.md`: setup should keep one dominant path to first success.
- `docs/demo/demo-claims-guardrails.md`: the UI must not imply production regional coverage or live global verification when the demo does not prove it.

### External References

- None. The repo already contains the architectural direction and UX constraints needed for this planning pass.

## Key Technical Decisions

- Model placement as part of the persisted `DomainRecord` payload instead of adding a new database table.
  Rationale: `control_domains.payload` already stores the full zone JSON shape. The smallest durable change is to persist placement intent there, while still separating derived target resolution and revision-scoped rollout observations conceptually in the read model.

- Treat edge inventory as infrastructure config surfaced by Go, not as a user-owned persisted resource.
  Rationale: the node list comes from the deployed topology (`docker-compose.yml` and edge env/config), not from user input. A read endpoint for eligible nodes is enough for the create flow.

- Default every new zone to `all eligible`, and reveal subset selection only in an advanced disclosure.
  Rationale: this matches the requested product behavior and preserves the simpler onboarding path already established in the current repo plans.

- Interpret `all eligible` as a dynamic mode and `subset` as a pinned mode.
  Rationale: if `all eligible` were snapshotted at create time, it would behave like a hidden subset and the label would be misleading. Existing all-node zones should automatically expand when new eligible nodes are added later; subset zones should not.

- Make placement intent the durable source of truth, and treat resolved targets plus rollout state as derived views.
  Rationale: user intent (`all-eligible` vs `subset`) changes rarely, but target resolution and per-node rollout status change whenever topology or revision state changes. Separating these lifecycles avoids stale snapshots and keeps async rollout reconciliation tractable.

- Reuse broadcast config propagation and let each edge self-filter by node ID when deciding whether a zone applies locally.
  Rationale: this is consistent with the prior Redis Streams plan and avoids introducing one stream, queue, or mutating endpoint per node.

- Separate `intent stored` from `rollout confirmed` in the create success path.
  Rationale: creation should persist the zone immediately, but rollout across multiple edges is asynchronous. The zone detail page must show pending, applied, or failed state per target node after redirect.

- Keep the existing global revision fields as derived summaries once per-node rollout exists.
  Rationale: current UI code and contracts already read `activeRevisionId` and `appliedRevisionId`. The plan should preserve them as compatibility fields summarizing the active revision and the latest fully confirmed revision on the target scope, rather than leaving them as competing rollout authorities.

- Use explicit apply acknowledgements, not request proofs, as rollout confirmation.
  Rationale: proofs show traffic behavior on one node. Rollout confirmation should advance only when a targeted edge reports that it has applied the revision/config locally. Proofs and logs remain supporting evidence, not the authoritative apply signal.

- Define one authoritative topology source and project it outward to every layer.
  Rationale: node IDs now need to match across Go inventory APIs, Rust runtime config, Nginx node-specific routes, Docker Compose services, and UI selection. The plan should treat one Go-owned topology config as canonical and make other layers projections of it.

- New or rejoining edges must bootstrap current state before they can be treated as eligible apply targets.
  Rationale: dynamic `all-eligible` only works if a late-joining edge can load the current zone state and active revisions before the UI starts claiming that the zone targets it.

- Add explicit node identity to proof and log payloads before using them as rollout evidence.
  Rationale: once multiple edges exist, a proof without node attribution is not strong enough to explain placement or diagnose partial rollout.

- Keep public demo claims conservative even after multiple local edges exist.
  Rationale: local multi-edge deployment proves architecture shape and rollout mechanics; it does not automatically justify buyer-facing claims about a global production CDN footprint.

## Open Questions

### Resolved During Planning

- Should the create flow only display nodes or allow user selection?
  Resolution: allow optional subset selection, but keep the default path as "all eligible nodes".

- Should node selection be required for every new pull zone?
  Resolution: no. Node selection is advanced configuration, not a required first-step decision.

- What does create success mean?
  Resolution: the zone and its placement intent are persisted successfully; rollout confirmation is a subsequent state visible on the zone detail page.

- What happens when new eligible edge nodes are introduced later?
  Resolution: zones in `all eligible` mode automatically expand to include them only after the node has completed topology bootstrap and can receive/apply the current config state; zones in `subset` mode remain pinned to their explicitly selected nodes.

- What counts as an eligible node for the create flow?
  Resolution: nodes present in the control-plane topology inventory and marked enabled for placement. Runtime health influences rollout state, not the selectable inventory contract.

### Deferred to Implementation

- Whether subset editing should ship on the zone detail page in the first implementation or remain create-time only.
  Why deferred: the requested scope explicitly centers on create-time visibility and selection. Post-create editing can be added later if the initial rollout UX proves insufficient.

- Whether the cleanest zone-detail presentation is an expanded `PolicyRevisionBanner` or a separate `EdgeDeploymentCard`.
  Why deferred: the correct UI boundary depends on how much rollout state is added beside the existing revision banner.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```mermaid
flowchart TB
  A[Create zone page] --> B[Fetch eligible edge inventory from Go]
  B --> C[Default summary: deploy to all eligible nodes]
  C --> D[Advanced disclosure: optional subset selection]
  D --> E[/api/reseed POST]
  E --> F[Go POST /domains]
  F --> G[Persist DomainRecord with placement mode and rollout placeholders]
  G --> H[Broadcast config/revision update]
  H --> I[edge-us-east]
  H --> J[edge-eu-west]
  H --> K[edge-ap-south]
  I --> L[Go rollout + proof/log ingest with node identity]
  J --> L
  K --> L
  L --> M[Zone detail shows intended nodes, applied nodes, and failures]
```

### Deployment Scope Modes

| Mode | User sees at create time | Target set behavior later | User-facing success language |
|---|---|---|---|
| `all-eligible` | "Deploying to all eligible edge nodes" plus node chips | Auto-expands when new enabled nodes are added | "Deployment queued for all eligible nodes" |
| `subset` | Explicit checked nodes in advanced selector | Stays pinned to chosen nodes until edited | "Deployment queued for selected nodes" |

### State Ownership Model

| State kind | Purpose | Lifecycle | Planned authority |
|---|---|---|---|
| Placement intent | Stores whether the user chose `all-eligible` or `subset`, plus explicit node IDs for subset mode | Durable until the user changes placement | Persisted in `DomainRecord` |
| Resolved target set | Lists which nodes currently count as targets for the active topology | Recomputed when topology changes or when placement intent changes | Derived in Go from topology + placement intent |
| Revision rollout state | Tracks `pending`, `applied`, or `failed` per targeted node for the active revision | Changes as edges bootstrap, apply, fail, or recover | Derived/read model in Go from node acknowledgements |

### Rollout Confirmation Rules

- `activeRevisionId` remains the desired revision for the zone.
- `appliedRevisionId` becomes a derived summary meaning "latest revision fully confirmed across the current resolved target set."
- A node moves from `pending` to `applied` only when the edge explicitly acknowledges local apply for that revision.
- Request proof and service logs may reference a node and revision, but they do not on their own advance rollout confirmation.
- A newly added edge only enters the resolved target set for `all-eligible` zones after it completes initial bootstrap and can apply the current revision.

## Implementation Units

- [x] **Unit 1: Add edge topology and placement contracts to shared types and Go APIs**

**Goal:** Introduce a stable control-plane contract for edge inventory, zone placement intent, and per-node rollout state.

**Requirements:** R1, R2, R4, R5, R6

**Dependencies:** None

**Files:**
- Modify: `services/shared/src/types.ts`
- Modify: `api-go/internal/state/types.go`
- Create: `api-go/internal/state/edge_topology.go`
- Modify: `api-go/internal/state/store.go`
- Modify: `api-go/internal/http/handlers.go`
- Modify: `lib/demo/service-client.ts`
- Modify: `lib/demo/service-endpoints.ts`
- Test: `api-go/internal/state/store_test.go`
- Test: `api-go/internal/http/handlers_test.go`

**Approach:**
- Add shared types for edge inventory and domain placement, including a mode field (`all-eligible` vs `subset`), explicitly selected node IDs, derived target node IDs, and per-node rollout states.
- Keep placement data inside the persisted domain payload so existing domain persistence remains the source of truth.
- Source edge inventory from Go-side topology config rather than persisting it per user. The store should expose a read model for enabled nodes and derive default target sets from that inventory.
- Make the Go-side topology definition the single canonical source for node ID, region, label, enabled status, and any node-specific verification slug. Compose, Rust env, and Nginx should be generated from or manually aligned to that same identity contract.
- Add a read endpoint for eligible nodes and extend the existing domain responses so placement information is available to both the create flow and the zone-detail page.
- Maintain backward compatibility for existing stored domains by deriving `all-eligible` placement when placement fields are absent in older payloads.
- Explicitly model three layers in the API contract: durable placement intent, current resolved targets, and revision-scoped rollout state.

**Patterns to follow:**
- Follow the existing mirrored TS/Go type pattern in `services/shared/src/types.ts` and `api-go/internal/state/types.go`.
- Keep request handlers thin, matching `app/api/reseed/route.ts` -> `api-go/internal/http/handlers.go` -> `api-go/internal/state/store.go`.

**Test scenarios:**
- Happy path: `GET` edge inventory returns all enabled nodes with stable IDs, labels, and regions in deterministic order.
- Happy path: a legacy domain payload without placement fields is read back as `all-eligible` with the current eligible node list.
- Edge case: a `subset` create request with duplicate node IDs is normalized to unique node IDs without losing the intended selection.
- Error path: a create request with an unknown node ID is rejected with a validation error instead of silently dropping the node.
- Error path: a `subset` create request with zero selected nodes is rejected with a clear validation error.
- Integration: `POST /domains` returns the persisted placement summary that `GET /domains/:id` later returns unchanged.
- Integration: the domain response keeps `activeRevisionId` and `appliedRevisionId`, but documents them as derived summary fields once per-node rollout state exists.

**Verification:**
- The control plane can describe both the available node inventory and a zone's intended placement without any UI-specific translation layer.

- [x] **Unit 2: Extend the create flow to show default deployment scope and optional subset selection**

**Goal:** Make edge placement visible during pull-zone creation while keeping the default path simple.

**Requirements:** R2, R3, R4, R7, R8

**Dependencies:** Unit 1

**Files:**
- Modify: `app/domains/new/page.tsx`
- Modify: `components/demo/new-domain-form.tsx`
- Modify: `app/api/reseed/route.ts`
- Modify: `lib/demo/service-client.ts`
- Test: `tests/demo/new-domain-form.test.tsx`
- Test: `tests/demo/dashboard-flow.test.tsx`

**Approach:**
- Fetch eligible edge nodes in the server route for `/domains/new` and pass them into `NewDomainForm`, keeping reads in the existing server-component/data-client pattern.
- Add a default placement summary near the existing create-form intro copy so the user sees which nodes the zone will target even if they never open advanced options.
- Implement advanced subset selection as progressive disclosure with clear copy that choosing a subset narrows deployment scope instead of accelerating onboarding.
- Extend the submit payload so the existing Next mutation proxy forwards placement mode and selected node IDs to Go.
- Keep the submit button behavior unchanged: create the zone, then redirect to the zone-detail page where rollout state continues.

**Patterns to follow:**
- Preserve the controlled-input and `useTransition` pattern already used in `components/demo/new-domain-form.tsx`.
- Follow the simplified onboarding guidance from `docs/plans/2026-04-01-001-feat-simplify-onboarding-flow-plan.md`: one dominant next action, advanced choices secondary.

**Test scenarios:**
- Happy path: the create form shows a default placement summary such as "Deploying to 3 eligible edge nodes" before the user expands advanced settings.
- Happy path: leaving advanced settings untouched submits `all-eligible` placement and redirects to the new zone detail page.
- Happy path: selecting a subset in advanced settings submits `subset` placement with the chosen node IDs.
- Edge case: only one eligible node exists; the form still shows the placement summary but does not present a confusing multi-select affordance.
- Edge case: toggling from `subset` back to `all-eligible` clears explicit selection and restores the default summary.
- Error path: create failure due to invalid node selection renders an inline error without losing the rest of the form state.
- Integration: the submitted placement data passes through `app/api/reseed/route.ts` unchanged into `POST /domains`.

**Verification:**
- A user can tell where the zone will deploy before submit, and the default path still feels like a simple "create pull zone" action rather than an infrastructure wizard.

- [x] **Unit 3: Deploy multiple local edge instances and give every edge a stable identity**

**Goal:** Turn the local runtime into a true multi-edge topology with node-specific identity and verification paths.

**Requirements:** R1, R5, R8

**Dependencies:** Unit 1

**Files:**
- Modify: `docker-compose.yml`
- Modify: `nginx/nginx.conf`
- Modify: `edge-rust/src/config.rs`
- Modify: `edge-rust/src/main.rs`
- Modify: `edge-rust/src/request_flow.rs`
- Modify: `lib/demo/service-endpoints.ts`
- Modify: `app/api/request/route.ts`
- Modify: `docs/demo/service-map.md`
- Test: `tests/demo/request-proof.test.ts`
- Test: `edge-rust/src/request_flow.rs`

**Approach:**
- Expand local infra from one `edge` service to multiple named edge services with explicit environment variables for node ID, region, and display name.
- Update Nginx so the demo can both continue the existing request flow and expose node-specific routes or upstreams for targeted verification without overclaiming public geo-routing.
- Preserve the existing single generic edge URL for the default proof path, and add separate node-targeted verification routes only as explicit diagnostics so the UI and docs can distinguish generic traffic proof from node-specific verification.
- Ensure every edge includes node identity in the control-plane requests it makes and in the proof/log payloads it sends back.
- Require every edge to bootstrap current topology/config state before announcing itself as eligible for placement or apply confirmation.
- Keep the demo story honest: multiple local edges prove topology and rollout mechanics, not a production POP footprint.

**Patterns to follow:**
- Reuse the existing env-driven runtime config shape in `edge-rust/src/config.rs`.
- Preserve the existing ingress split in `nginx/nginx.conf`, adding only the minimum extra routing needed for multi-edge verification.

**Test scenarios:**
- Happy path: each edge instance boots with a distinct node ID and region and reports that identity in its health/runtime behavior.
- Happy path: a node-specific proof request records the serving node ID in the resulting proof/log payloads.
- Edge case: the generic ingress path continues to serve the existing demo path even when node-specific verification routes are added.
- Edge case: a newly started edge does not appear as an eligible target until its bootstrap handshake completes.
- Error path: missing node identity configuration fails fast instead of silently treating multiple instances as the same edge.
- Integration: Nginx routes for node-specific verification hit the intended edge instance rather than an arbitrary upstream.

**Verification:**
- The local stack can run multiple Rust edge containers at once, and downstream telemetry can tell which node handled a request.

- [x] **Unit 4: Connect placement intent to config rollout and per-node apply tracking**

**Goal:** Make the control plane and edge runtime agree on which nodes should apply a zone and how apply status is reported.

**Requirements:** R4, R5, R6, R8

**Dependencies:** Units 1 and 3, plus the config-broadcast direction already defined in `docs/plans/2026-03-31-feat-e2e-cdn-integration-plan.md`

**Files:**
- Modify: `api-go/internal/state/store.go`
- Modify: `api-go/internal/http/handlers.go`
- Modify: `api-go/internal/state/types.go`
- Modify: `edge-rust/src/request_flow.rs`
- Modify: `api-go/internal/analytics/service_test.go`
- Test: `api-go/internal/state/store_test.go`
- Test: `api-go/internal/http/handlers_test.go`
- Test: `tests/demo/request-proof.test.ts`

**Approach:**
- Use the placement contract from Unit 1 as the source of truth when a new zone is created or a revision changes.
- Keep the propagation model aligned with the earlier Redis/outbox plan: broadcast config events to all edge nodes, then let each edge decide whether the zone should apply on that node based on its own node ID and the zone's target set.
- Add per-node rollout status fields so the control plane can distinguish `pending`, `applied`, and `failed` for each target node and for each active revision.
- Update ingest/telemetry paths so node identity is always attached to apply acknowledgements, rollout evidence, and later request proofs.
- Treat create success as "intent stored" and drive the first rollout state from asynchronous edge acknowledgement rather than pretending the revision is already confirmed everywhere.
- Define bootstrap/rejoin behavior explicitly: when a new edge joins, Go resolves whether `all-eligible` zones should now target it, the edge loads current state, and only then can it begin reporting apply acknowledgements for the active revision.

**Patterns to follow:**
- Reuse the existing store-owned domain persistence flow in `api-go/internal/state/store.go`.
- Keep proofs/logs flowing through the existing ingest channel rather than creating a second analytics pipeline.

**Test scenarios:**
- Happy path: a new zone in `all-eligible` mode marks every enabled node as targeted and enters a per-node pending rollout state after create.
- Happy path: a zone in `subset` mode only targets the selected nodes and ignores non-selected nodes during apply tracking.
- Edge case: when a new eligible node is added later, existing `all-eligible` zones expand their target set while `subset` zones do not.
- Edge case: when a new eligible node is added later, it remains outside the resolved target set until bootstrap completes, then enters pending rollout for the active revision.
- Error path: if one targeted node fails to apply the revision, the zone remains created but reports a degraded rollout state naming the failed node.
- Error path: telemetry from an unknown node ID is rejected or quarantined instead of corrupting zone rollout state.
- Integration: node-attributed apply acknowledgements update the matching zone's per-node rollout state without mutating unrelated nodes, while proofs remain traffic evidence only.

**Verification:**
- The control plane can explain, per zone, which nodes are intended targets and which of those have actually applied the active revision.

- [x] **Unit 5: Surface placement and rollout state in the zone detail workflow**

**Goal:** Show users both the intended deployment scope and the actual node-by-node rollout state after create.

**Requirements:** R4, R5, R7, R8

**Dependencies:** Units 2 and 4

**Files:**
- Modify: `app/domains/[domainId]/page.tsx`
- Modify: `app/api/domains/[domainId]/route.ts`
- Modify: `components/demo/zone-detail-shell.tsx`
- Modify: `components/demo/policy-revision-banner.tsx`
- Create: `components/demo/edge-deployment-card.tsx`
- Modify: `components/demo/request-proof-panel.tsx`
- Modify: `components/demo/evidence-tabs.tsx`
- Test: `tests/demo/zone-detail-shell.test.tsx`
- Test: `tests/demo/request-proof-panel.test.tsx`
- Test: `tests/demo/evidence-tabs.test.tsx`

**Approach:**
- Add a placement summary to the zone detail header area so the user sees whether the zone targets all eligible nodes or a pinned subset.
- Show per-node rollout state close to the existing revision/apply banner, including a clear distinction between pending rollout and confirmed apply.
- Add node identity to proof and log presentation so a reviewer can tell which edge served a request.
- Keep the copy honest: one successful proof from one node must not be presented as "all edges live" when other targeted nodes are still pending or failed.
- If node-specific verification routes land in Unit 3, use them as secondary detail rather than making them the dominant onboarding action.
- Preserve any future domain-scoped mutation path behind the existing `app/api/domains/[domainId]/route.ts` proxy pattern instead of adding direct browser-to-Go mutations for rollout-related actions.

**Patterns to follow:**
- Reuse the existing top-of-page status emphasis in `components/demo/policy-revision-banner.tsx` and `components/demo/zone-detail-shell.tsx`.
- Preserve the proof-first ordering from the onboarding plans: rollout status supports the story, but request proof remains the immediate source of truth.

**Test scenarios:**
- Happy path: after create, the zone detail page shows the intended target nodes and a pending rollout summary before any node confirmations arrive.
- Happy path: once all targeted nodes apply, the banner/card reads as fully confirmed on the selected scope rather than globally across all inventory.
- Edge case: a zone in `subset` mode shows only the selected nodes, not the full inventory, while still making the narrower scope obvious.
- Edge case: one proof from one node displays the serving node ID without implying that all targeted nodes have served traffic.
- Edge case: the page distinguishes "generic proof path succeeded" from "node-targeted verification succeeded" when both are available.
- Error path: a failed target node surfaces a clear degraded rollout message and names the node needing attention.
- Integration: the zone detail workflow renders setup, rollout, proof, logs, and analytics in a consistent order without hiding the new placement state.

**Verification:**
- After creating a zone, the user can answer two questions from the zone detail page without guessing: "Where is this supposed to run?" and "Which target nodes have actually applied it?"

- [x] **Unit 6: Update demo docs and verification narratives for multi-edge honesty**

**Goal:** Align supporting docs and test narratives with the new multi-edge behavior so the demo remains truthful.

**Requirements:** R8

**Dependencies:** Units 3, 4, and 5

**Files:**
- Modify: `README.md`
- Modify: `docs/demo/service-map.md`
- Modify: `docs/demo/demo-claims-guardrails.md`
- Modify: `tasks/todo.md`

**Approach:**
- Document the local multi-edge topology and how node-specific verification works.
- Update the guardrails so reviewers and presenters distinguish "multi-edge rollout visible in the demo" from "production-ready global routing."
- Capture the intended verification story for all-eligible vs subset zones so future UI changes do not regress the honesty boundary.

**Patterns to follow:**
- Follow the existing tone in `docs/demo/demo-claims-guardrails.md`: precise, conservative, and explicit about what the demo does and does not prove.

**Test scenarios:**
- Test expectation: none -- this unit updates supporting documentation and review notes rather than shipping new runtime behavior.

**Verification:**
- Demo scripts, docs, and review notes describe the new topology and rollout behavior without overstating product maturity.

## System-Wide Impact

- **Interaction graph:** `/domains/new` -> `app/api/reseed/route.ts` -> `POST /domains` -> persisted placement intent -> config broadcast/apply -> node-aware proof/log ingest -> `/domains/[domainId]` rollout visibility.
- **Interaction graph:** `/domains/new` -> `app/api/reseed/route.ts` -> `POST /domains` -> persisted placement intent -> derived target resolution in Go -> config broadcast/apply -> node acknowledgements + node-aware proof/log ingest -> `/domains/[domainId]` rollout visibility.
- **Error propagation:** invalid or empty subset selections should fail at create time; node apply failures should not delete the zone, but should surface a degraded rollout state on the detail page.
- **State lifecycle risks:** `all-eligible` zones must expand when inventory changes; subset zones must stay pinned; removed or disabled nodes must not leave stale success indicators behind; late-joining nodes must bootstrap before they count as active targets.
- **API surface parity:** TS and Go domain types, edge context, and ingest payloads all gain new placement/node fields and must stay mirrored.
- **Integration coverage:** the key cross-layer scenarios are `create all-eligible zone`, `create subset zone`, `bootstrap a new node`, `add new node later`, `one node fails apply`, and `proof from one node while another target is still pending`.
- **Unchanged invariants:** request proof remains the immediate truth for traffic behavior, analytics freshness semantics remain unchanged, and the demo still avoids claiming production global CDN reach.

## Alternative Approaches Considered

- **Display-only placement with no persisted selection**
  Rejected because the user explicitly asked for an option to let users select nodes, and display-only placement would not solve the underlying control-plane modeling problem.

- **Make node selection mandatory during creation**
  Rejected because it would contradict the simplified onboarding flow and front-load an advanced infrastructure decision before the user has even created the zone.

- **Create one dedicated mutation channel per edge node**
  Rejected because the repo already points toward broadcast propagation. Per-node mutation channels would fight that design and add unnecessary control-plane complexity.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Placement UI makes onboarding feel like infrastructure setup instead of a simple create flow | Keep default behavior explicit and automatic; place subset selection behind progressive disclosure |
| One proof from one edge is misread as confirmation of global rollout | Add node identity to proofs/logs and keep rollout confirmation separate from proof success |
| `all-eligible` semantics drift when inventory changes | Define `all-eligible` as a dynamic mode in the domain model and cover node-addition behavior in store tests |
| Multiple local edges exist but runtime telemetry cannot attribute apply/proof state correctly | Add mandatory node identity to edge runtime config and reject unknown-node telemetry |
| The feature forks away from the existing Redis/outbox rollout direction | Explicitly layer this work on top of `docs/plans/2026-03-31-feat-e2e-cdn-integration-plan.md` instead of inventing a second propagation path |

## Dependencies / Prerequisites

- The repo needs a control-plane edge inventory source, derived from the local topology configuration.
- The config propagation work described in `docs/plans/2026-03-31-feat-e2e-cdn-integration-plan.md` remains the intended transport for real per-node apply confirmation.
- The simplified onboarding flow from `docs/plans/2026-04-01-001-feat-simplify-onboarding-flow-plan.md` remains the UX baseline for how advanced node selection is introduced.

## Documentation / Operational Notes

- Keep the public demo script conservative: talk about visible multi-edge rollout and node targeting, not production POP count.
- Prefer node-specific verification routes or diagnostics for confirming rollout across local edges instead of implying that the generic ingress path proves every node equally.
- Generic ingress proof should be documented as traffic evidence only; node-targeted verification, when present, should be documented as a diagnostic for a specific edge node, not as the authoritative rollout signal.
- If the implementation lands before the full config-broadcast path is complete, the UI copy must explicitly label rollout as pending runtime confirmation rather than silently assuming success.

## Sources & References

- Related plan: `docs/plans/2026-03-31-feat-e2e-cdn-integration-plan.md`
- Related plan: `docs/plans/2026-04-01-001-feat-simplify-onboarding-flow-plan.md`
- Related code: `components/demo/new-domain-form.tsx`
- Related code: `app/api/reseed/route.ts`
- Related code: `api-go/internal/http/handlers.go`
- Related code: `api-go/internal/state/store.go`
- Related code: `edge-rust/src/request_flow.rs`
- Related code: `docker-compose.yml`
- Related code: `app/api/request/route.ts`
- Related code: `app/api/domains/[domainId]/route.ts`
- Related code: `lib/demo/service-endpoints.ts`
- Related code: `components/demo/request-proof-panel.tsx`
- Related code: `components/demo/evidence-tabs.tsx`
- Internal guidance: `docs/demo/demo-claims-guardrails.md`
