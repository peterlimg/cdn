# Task Checklist

- [completed] Execute Units 0-2 from `docs/plans/2026-04-01-002-feat-langfuse-style-ui-refinement-plan.md`.
- [completed] Normalize the shared visual grammar in `app/globals.css` and `app/layout.tsx`, including auth-shell primitives.
- [completed] Resolve `/`, `/domains`, and `/login` route roles plus auth redirect handoff.
- [completed] Refine the signed-out landing and login composition to feel tighter and more Langfuse-like.
- [completed] Add focused tests for root-route and login behavior.
- [completed] Run targeted tests and a production build for the first redesign slice.

- [completed] Inspect current signed-in overview and shared app shell for remaining landing-page styling.
- [completed] Replace the signed-in overview hero/right rail with a product-first pull-zones view that shows either the empty state or the user's sites.
- [completed] Update shared authenticated shell styling so nav, actions, surfaces, and hierarchy follow the darker Langfuse-like direction across pages.
- [completed] Verify the changed UI with focused tests and production build.
- [completed] Move the active revision banner to the top of the zone detail workflow.
- [completed] Compress the live-proof panel so recent requests use less vertical space.
- [completed] Tighten the signed-out hero headline so it fits the centered typography better.
- [completed] Lighten the hero background and add a subtler Langfuse-like texture.

- [completed] Research repo surfaces for real user CDN onboarding/setup planning.
- [completed] Inspect current domain models, onboarding UX, proof flow, origin route, policy publishing, and analytics/log surfaces.
- [completed] Summarize repo-grounded guidance and reference file paths for a new plan.
- [completed] Research the current pull-zone creation flow and edge topology for multi-node deployment planning.
- [completed] Resolve the product default for edge targeting: all eligible nodes by default, with optional subset selection.
- [completed] Write `docs/plans/2026-04-01-003-feat-multi-edge-pull-zone-targeting-plan.md`.

- [completed] Fix remaining Unit 5 precedence mismatch in Rust edge request flow.
- [completed] Remove unsafe ClickHouse replay/backfill path and keep analytics honesty under degradation.
- [completed] Re-run focused verification for Go, Rust, and app tests/build.
- [completed] Update plan review notes and checklist state for the completed fixes.
- [completed] Verify full Docker Compose startup and fix container-specific edge issues.
- [completed] Add host-based edge routing and enforce hostname uniqueness in the control plane.
- [completed] Add distinct per-domain static origins so hostnames visibly serve different content through the CDN.
- [completed] Add a separate network static deployment flow that provisions a static origin path before attaching it to the CDN.

- [completed] Rework authenticated overview and sites pages so the first fold feels denser and more product-like.
- [completed] Use dashboard snapshot data on `/` and `/domains` to show supporting proof, quota, and setup context.
- [completed] Tighten authenticated shell spacing and supporting panel styling to reduce blank space.
- [completed] Re-run focused tests and browser verification for the updated authenticated pages.

- [in_progress] Extend the sharper builder-style visual language across post-login pages.
- [pending] Fix quota percentage formatting so stat tiles do not overflow with long decimals.
- [pending] Re-run focused tests, build, and browser verification for the authenticated styling pass.
- [completed] Extend the sharper builder-style visual language across post-login pages.
- [completed] Fix quota percentage formatting so stat tiles do not overflow with long decimals.
- [completed] Re-run focused tests, build, and browser verification for the authenticated styling pass.

# Lessons

- When the user asks for a real end-user onboarding/setup flow, do not stay anchored on the existing demo proof-loop framing. Rewrite the plan around the user journey directly instead of repeatedly qualifying it through demo constraints.

# Review

- Signed-in overview now reuses the pull-zones workspace directly, removes the right-side hero card, and no longer shows the large landing typography after login.
- Shared authenticated chrome now uses a slimmer top bar with quieter pills, denser surfaces, and darker neutral styling so Overview, Sites, Analytics, and Zone Detail feel like the same product.
- Zone detail now surfaces the active revision and edge apply status at the top of the workflow, instead of burying it beside analytics.
- Live proof now uses a denser, scrollable event list so repeated proof requests do not push the rest of the page too far down.
- The signed-out hero headline is now shorter so the centered display type reads tightly instead of breaking awkwardly.
- The hero surface now uses a lighter dark gradient with a subtle dot texture, closer to the Langfuse-style atmosphere.
- Authenticated Overview now uses the dashboard snapshot directly, adding a denser six-metric strip plus right-side next-action and latest-proof panels in the first fold.
- Authenticated Sites now uses the same snapshot-driven grammar, pairing the zone directory with setup-queue and proof-queue support panels so the page no longer reads like a single list on an empty canvas.
- Browser verification confirmed both signed-in pages now expose more first-fold actions and supporting panels than before, reducing the blank feel that showed up in the Langfuse comparison.
- The public homepage now uses a sharper builder-style hero with console-like proof framing, and the authenticated Overview, Sites, Analytics, and zone detail surfaces now share that more technical visual grammar.
- UI-facing uses of the word `demo` were removed from the frontend, including metadata, product copy, visible hostnames, and quota/value messaging.
- Quota percentage tiles now round to a short display format so large decimal values no longer overflow the stat cards.
- Analytics and zone detail now use denser split-workspace layouts so post-proof confirmation and active zone controls read like one operator surface instead of stacked generic cards.
- Verification passed with `npm test -- tests/demo/dashboard-flow.test.tsx` and `npm run build`.
- Added `docs/plans/2026-04-01-003-feat-multi-edge-pull-zone-targeting-plan.md`, which sequences control-plane placement modeling, multi-edge runtime topology, rollout telemetry, and zone-detail visibility while preserving the repo's onboarding and demo-honesty constraints.
