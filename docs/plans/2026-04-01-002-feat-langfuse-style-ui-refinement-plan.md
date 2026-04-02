---
title: "feat: Align CDN UI with Langfuse-Style Product Grammar"
type: feat
status: active
date: 2026-04-01
---

# feat: Align CDN UI with Langfuse-Style Product Grammar

## Overview

Refine the user-facing Next.js UI so the product feels closer to the visual discipline of `langfuse.com`: restrained dark surfaces, strong type hierarchy, calmer chrome, compact high-contrast CTAs, and a consistent product shell across landing, auth, overview, sites, zone detail, and analytics.

This is not a homepage clone plan. It is a cross-page UI system plan for making the CDN demo feel like one premium product instead of a set of individually restyled screens.

## Problem Frame

The current UI has improved, but it still feels stitched together instead of designed as one system:

- `app/page.tsx` still carries both marketing and authenticated-home responsibilities, which makes the root route structurally ambiguous.
- `components/demo/domains-shell.tsx` is being used as both overview and sites index, even though those pages should have different jobs.
- `components/demo/analytics-page-shell.tsx` is being used both as a standalone page and an embedded zone-detail panel, which blurs whether analytics is global reporting or contextual confirmation.
- `app/globals.css` has accumulated multiple overlapping surface patterns (`card`, `surface`, `kpi`, `stat-tile`, `zone-row`, `proof-entry`) without a single visual grammar for when each one should exist.
- `components/auth/login-form.tsx` references `auth-shell` and `auth-card`, but there is no matching CSS, which confirms that auth is still visually outside the shared system.
- The recent hero iteration showed the risk of literal mimicry: centering the typography without shortening the copy or adjusting the measure produced an awkward vertical stack rather than a deliberate display composition.

The user explicitly wants the product to feel like Langfuse across the whole app, not just in the landing hero. That means solving information architecture, shell grammar, page hierarchy, and density rules together rather than continuing with isolated CSS tweaks.

## Requirements Trace

- R1. The visual language must align with the Langfuse reference at the system level: restrained dark backgrounds, subtle layered texture, soft borders, compact chrome, oversized but controlled typography, and strong content hierarchy.
- R2. Signed-out and signed-in experiences must share one coherent brand/product system while still serving different jobs.
- R3. The authenticated app must stop feeling like a landing page after login; overview, sites, zone detail, and analytics should read as product UI first.
- R4. Each primary page must have a distinct job and layout grammar: landing persuades, login converts, overview orients, sites scans, zone detail guides, analytics interprets.
- R5. The redesign must preserve existing product honesty: request proof remains the immediate truth, logs explain it, analytics confirms it.
- R6. The implementation must preserve responsive and accessibility quality, especially in the topbar, CTA placement, dense evidence panels, and any progressive disclosure introduced during cleanup.
- R7. The implementation should reuse the current routes and backend contracts unless a small UI-facing split is necessary to give pages distinct jobs.

## Scope Boundaries

- Non-goal: pixel-matching or recreating Langfuse branding, copy, exact fonts, or marketing content.
- Non-goal: changing control-plane, edge, analytics, or domain-state backend behavior unless a tiny UI-facing helper is needed.
- Non-goal: inventing a new component framework or large internal design system package for this repo.
- Non-goal: replacing the existing onboarding flow decisions from `docs/plans/2026-04-01-001-feat-simplify-onboarding-flow-plan.md`.
- Non-goal: hiding honest demo caveats in order to look more “polished.”

## Context & Research

### Relevant Code and Patterns

- `app/layout.tsx`: current global shell, topbar split, and signed-in/signed-out chrome.
- `app/globals.css`: the entire shared visual language currently lives here.
- `app/page.tsx`: dual-mode root route for signed-out landing and signed-in overview.
- `app/domains/page.tsx`: current authenticated sites entry.
- `components/demo/domains-shell.tsx`: current signed-in overview/sites list shell.
- `app/login/page.tsx` and `app/auth/actions.ts`: current auth redirect target is `/domains`.
- `components/auth/login-form.tsx`: auth form copy and currently broken `auth-shell` / `auth-card` class usage.
- `app/domains/new/page.tsx` and `components/demo/new-domain-form.tsx`: create-zone entry surface.
- `app/domains/[domainId]/page.tsx` and `components/demo/zone-detail-shell.tsx`: primary operational workspace.
- `components/demo/request-proof-panel.tsx`, `components/demo/evidence-tabs.tsx`, `components/demo/policy-revision-banner.tsx`: current evidence and status hierarchy.
- `app/analytics/page.tsx` and `components/demo/analytics-page-shell.tsx`: analytics framing, currently reused in both page and embedded contexts.

### Institutional Learnings

- `docs/plans/2026-04-01-001-feat-simplify-onboarding-flow-plan.md`: the app should have one dominant next action per screen and should keep setup/proof/logs/analytics in a clear order.
- `docs/plans/2026-03-31-feat-real-user-cdn-onboarding-flow-plan.md`: the authenticated entry should feel like a real product setup journey, not a demo operator tool.
- `docs/demo/logs-and-evidence-guide.md`: proof/logs are immediate truth; analytics is confirmation.
- `docs/demo/presentation-readiness-checklist.md`: the main product narrative should stay `config -> proof -> logs -> analytics`.
- `docs/demo/demo-claims-guardrails.md`: visual polish must not imply false product maturity.

### External References

- `https://langfuse.com/` reviewed on 2026-04-01 via direct HTML fetch and user-provided screenshots.
- Planning-relevant cues from that review:
  - sticky translucent top header with blur and low-contrast border
  - wide centered container rhythm with consistent spacing tokens
  - restrained dark backgrounds with subtle layered texture rather than heavy opaque slabs
  - oversized display typography paired with short, tight copy rather than long centered paragraphs
  - compact rounded CTAs with strong contrast and very little decorative chrome
  - shared visual grammar across marketing and product-like surfaces rather than page-specific one-offs

## Key Technical Decisions

- Keep `/` as the authenticated home when a session exists, and stop treating it as a second copy of `/domains`.
  Rationale: the user explicitly asked for logged-in users to stop seeing landing typography and instead see their pull zones immediately. The root route should become the canonical product home for authenticated users.

- Reposition `/domains` as the dedicated sites index instead of reusing the same shell as authenticated home.
  Rationale: overview and index have different jobs. Overview should orient and prioritize the next action; the sites page should be denser and more scan-oriented.

- Treat Langfuse as a grammar reference, not an imitation target.
  Rationale: literal copying already produced awkward results. The right move is to borrow structure and restraint: shorter hero copy, better measure, softer surfaces, calmer chrome, and tighter CTA rhythm.

- Build one small shared visual grammar in `app/globals.css` instead of adding more one-off page styles or a new UI framework.
  Rationale: the repo has no existing component primitive layer. A disciplined CSS cleanup is the smallest change that can still make the app coherent.

- Split analytics into two presentation modes: standalone reporting page vs embedded zone confirmation panel.
  Rationale: the same component should not serve two different mental models. Standalone analytics needs page framing; embedded analytics should be lighter and subordinate to zone detail.

- Let domain state drive layout emphasis in zone detail.
  Rationale: a pending zone should foreground setup and blockers; a ready zone should foreground proof and confirmation. This is consistent with the existing onboarding plan and avoids equal-weight clutter.

- Preserve proof/logs/analytics honesty while refining appearance.
  Rationale: the product should feel more premium without misrepresenting what the demo actually proves.

## Open Questions

### Resolved During Planning

- Should the Langfuse-style pass focus only on the landing page?
  Resolution: No. The redesign target is the whole user-facing flow, especially authenticated surfaces.

- Should `/` become marketing-only so the app can separate concerns cleanly?
  Resolution: No. The user explicitly wants logged-in users to land on product UI at `/`.

- Should analytics remain the same component in both the global page and zone detail?
  Resolution: No. The plan should create a page-vs-panel distinction even if some summary cards are reused underneath.

- Should this plan introduce a separate design-system package?
  Resolution: No. Keep the implementation repo-native and minimal.

### Deferred to Implementation

- Whether the cleanest authenticated-home split is a new `OverviewShell` component or a `mode` prop on the current `DomainsShell`.
  Why deferred: both options are viable, and the smallest clear implementation should win after touching the JSX.

- Whether the best practical font treatment is to keep the current sans stack, adopt a repo-safe local mono accent, or simulate the Langfuse feel with weight/spacing alone.
  Why deferred: this is a styling ergonomics choice, not a planning blocker.

- Whether browser-level screenshot verification should extend `tests/demo/browser_smoke.py` or be introduced as a new focused UI smoke harness.
  Why deferred: the repo does not yet have a clear visual-regression convention.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### Page Grammar Matrix

| Page | Primary job | Header style | Main content shape | Secondary content rule | CTA pattern |
|------|--------------|--------------|--------------------|------------------------|-------------|
| Signed-out `/` | persuade and orient | translucent marketing header | one centered hero with tight headline and short supporting copy | supporting proof points sit below fold, never beside hero | one primary + one secondary |
| `/login` | convert to auth quickly | minimal product header | narrow auth card/surface | no marketing collage or extra explainer grid | one dominant form submit |
| Signed-in `/` | orient and resume work | compact product topbar | overview header + recent zones / empty state | secondary stats stay compact and subordinate | one dominant “new zone” action |
| `/domains` | scan all sites | compact product topbar | denser list/index shell | no marketing hero treatment | contextual create action |
| `/domains/new` | create a zone with low friction | compact product topbar | narrow task-first form surface | advanced hints stay inline and quiet | one dominant submit |
| `/domains/[domainId]` pending | complete setup | compact product topbar | state-driven workflow stack | logs/analytics remain secondary | one next-step CTA near top |
| `/domains/[domainId]` ready | operate and verify | compact product topbar | proof-first operational workspace | analytics and revision history stay below/adjacent but lighter | proof action dominates |
| `/analytics` | interpret aggregate behavior | compact product topbar | report-style page with concise framing | freshness caveats remain explicit | no oversized hero CTA |

### Visual Grammar Rules

- One shell, two modes: marketing and product share tokens, but only marketing gets oversized display composition.
- Surfaces separate content with low-contrast borders and subtle tonal differences, not heavy shadows or nested cards.
- CTA hierarchy stays compact: primary action, secondary action, then text links.
- Mono accent is optional and should be used only for labels, not body copy.
- Reuse the same spacing rhythm across pages so density changes come from layout purpose, not arbitrary padding changes.

## Implementation Units

- [ ] **Unit 0: Define the shared visual grammar in the global shell**

**Goal:** Give the app one coherent set of tokens and page primitives before refining page-specific layouts.

**Requirements:** R1, R2, R6

**Dependencies:** None

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Reference: `app/page.tsx`
- Reference: `components/auth/login-form.tsx`

**Approach:**
- Consolidate surface hierarchy so `card`, `surface`, list rows, stats, and alerts follow a smaller, more deliberate visual system.
- Add or normalize missing shared classes needed by auth and product pages, including the currently undefined `auth-shell` / `auth-card` selectors or their replacement.
- Separate marketing-shell rules from authenticated product-shell rules inside the existing global CSS rather than creating more page-specific drift.
- Introduce header/backdrop/container behavior that reflects the Langfuse-style cues: translucent topbar, soft borders, restrained depth, and consistent spacing.

**Patterns to follow:**
- Keep the global-shell entry point in `app/layout.tsx`.
- Keep the repo’s existing CSS-first styling approach in `app/globals.css`.

**Test scenarios:**
- Test expectation: none -- this unit establishes shared styling primitives and shell rules. Behavioral coverage lands in downstream page/component units.

**Verification:**
- Marketing and authenticated pages can both consume the same shell primitives without requiring ad hoc inline styling or undefined class names.

- [ ] **Unit 1: Resolve root-route information architecture and auth handoff**

**Goal:** Make `/`, `/domains`, and `/login` behave like a coherent entry flow instead of overlapping routes.

**Requirements:** R2, R3, R4, R7

**Dependencies:** Unit 0

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/domains/page.tsx`
- Modify: `app/login/page.tsx`
- Modify: `app/auth/actions.ts`
- Modify: `components/auth/login-form.tsx`
- Test: `tests/demo/home-page.test.tsx`
- Test: `tests/auth/login-form.test.tsx`

**Approach:**
- Keep `/` as signed-out marketing and signed-in product home.
- Make `/domains` the dedicated sites index rather than a duplicate of the root overview.
- Change auth redirects so successful login returns to `/` by default, while preserving intentional deep links such as “create first site” via a sanitized internal `next` parameter.
- Ensure signed-out navigation does not overpromise access to protected app pages without a clear auth handoff.

**Patterns to follow:**
- Reuse the existing session boundary in `getSession()` and server action flow in `app/auth/actions.ts`.
- Follow the repo’s current route-gating pattern in `app/login/page.tsx` and authenticated app pages.

**Test scenarios:**
- Happy path: signed-out `/` renders the marketing hero, while signed-in `/` renders product UI with no landing hero.
- Happy path: successful login without a `next` target redirects to `/`.
- Happy path: a login flow initiated from “Create first site” resumes to `/domains/new` after authentication.
- Edge case: an invalid or external `next` value is ignored and falls back to `/`.
- Error path: login validation errors remain inline and do not break redirect behavior.
- Integration: signed-in users visiting `/login` are redirected to the authenticated home rather than the sites index.

**Verification:**
- The app has one clear authenticated home, one clear sites index, and one predictable auth handoff path.

- [ ] **Unit 2: Refine signed-out landing and login composition**

**Goal:** Make the unauthenticated entry surfaces feel intentionally premium and tight rather than like literal Langfuse mimicry.

**Requirements:** R1, R2, R4, R6

**Dependencies:** Unit 0, Unit 1

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/auth/login-form.tsx`
- Modify: `app/globals.css`
- Test: `tests/demo/home-page.test.tsx`
- Test: `tests/auth/login-form.test.tsx`

**Approach:**
- Keep the landing hero centered, but ensure the display copy is short enough to balance naturally.
- Use a lighter, layered dark background with subtle texture and calmer chrome rather than a single opaque slab.
- Tighten the login page into a minimal product-entry surface that visually belongs to the same system as the landing and authenticated app.
- Keep CTA treatment compact and consistent with the shared shell instead of letting the landing diverge into its own button language.

**Patterns to follow:**
- Follow the centered-hero composition already established in `app/page.tsx`, but with shorter copy and better measure control.
- Preserve the existing form/action structure in `components/auth/login-form.tsx`.

**Test scenarios:**
- Happy path: the landing hero presents one short headline, one supporting paragraph, and exactly one primary plus one secondary CTA above the fold.
- Happy path: the login form renders inside the shared visual system and keeps one dominant submit action.
- Edge case: long translated or slightly expanded supporting copy wraps without collapsing the hero into a narrow vertical stack.
- Error path: login error state remains readable against the updated background and surface treatment.
- Responsive: landing hero and login form remain centered and legible on mobile without CTA overflow.

**Verification:**
- Signed-out surfaces feel like one coherent entry flow and no longer require one-off fixes to headline measure or background darkness.

- [ ] **Unit 3: Differentiate overview, sites index, and new-zone entry**

**Goal:** Make authenticated list-oriented pages feel like product UI with distinct jobs instead of reusing the same shell everywhere.

**Requirements:** R2, R3, R4, R7

**Dependencies:** Unit 0, Unit 1

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/domains/page.tsx`
- Modify: `app/domains/new/page.tsx`
- Modify: `components/demo/domains-shell.tsx`
- Modify or Create: `components/demo/overview-shell.tsx`
- Modify: `components/demo/new-domain-form.tsx`
- Modify: `components/demo/domain-readiness-badge.tsx`
- Test: `tests/demo/dashboard-flow.test.tsx`
- Test: `tests/demo/new-domain-form.test.tsx`
- Test: `tests/demo/home-page.test.tsx`

**Approach:**
- Stop using the same UI shell for both authenticated home and sites index.
- Give signed-in `/` an overview role: one short page header, one dominant create action, recent zones or a clean empty state, and compact supporting metrics.
- Keep `/domains` as the denser all-sites index.
- Make `/domains/new` feel like the first step of the same product journey, not a detached utility form.
- Reduce visual noise in badges, stats, and list rows so the page hierarchy comes from type and spacing, not from many competing mini-cards.

**Patterns to follow:**
- Reuse existing data-fetch patterns in `app/page.tsx` and `app/domains/page.tsx`.
- Preserve the current new-zone form behavior and API interaction in `components/demo/new-domain-form.tsx`.

**Test scenarios:**
- Happy path: signed-in `/` with zero zones shows a single empty-state recommendation and a create-zone action.
- Happy path: signed-in `/` with existing zones shows recent zones without duplicating the full `/domains` index treatment.
- Happy path: `/domains` shows the full sites list with status badges and open-zone actions.
- Happy path: `/domains/new` preserves the simplified form fields and dominant submit action.
- Edge case: a long hostname or origin wraps cleanly inside the updated list/index surfaces.
- Error path: create-zone failure remains inline and readable inside the tighter product form layout.
- Integration: creating a zone still routes directly into `/domains/[domainId]`.

**Verification:**
- Overview, sites index, and zone creation each have a visibly distinct role while still feeling like one product family.

- [ ] **Unit 4: Rebuild zone detail and analytics around page-vs-panel roles**

**Goal:** Make zone detail feel task-first and make analytics consistent with its true role as confirmation.

**Requirements:** R3, R4, R5, R6, R7

**Dependencies:** Unit 0, Unit 3

**Files:**
- Modify: `app/domains/[domainId]/page.tsx`
- Modify: `app/analytics/page.tsx`
- Modify: `components/demo/zone-detail-shell.tsx`
- Modify: `components/demo/domain-onboarding-card.tsx`
- Modify: `components/demo/domain-config-sections.tsx`
- Modify: `components/demo/evidence-tabs.tsx`
- Modify: `components/demo/request-proof-panel.tsx`
- Modify: `components/demo/cache-policy-card.tsx`
- Modify: `components/demo/policy-revision-banner.tsx`
- Modify: `components/demo/analytics-page-shell.tsx`
- Modify or Create: `components/demo/analytics-summary-panel.tsx`
- Modify: `components/demo/analytics-summary-cards.tsx`
- Modify: `components/demo/cache-value-card.tsx`
- Modify: `components/demo/quota-status-card.tsx`
- Modify: `components/demo/quota-threshold-banner.tsx`
- Modify: `components/demo/edge-log-panel.tsx`
- Modify: `components/demo/api-log-panel.tsx`
- Test: `tests/demo/zone-detail-shell.test.tsx`
- Test: `tests/demo/request-proof-panel.test.tsx`
- Test: `tests/demo/domain-config-sections.test.tsx`
- Test: `tests/demo/api-log-panel.test.tsx`
- Test: `tests/demo/analytics-page-shell.test.tsx`

**Approach:**
- Keep the revision/apply status visible near the top, but make it part of a broader state-driven page hierarchy.
- Distinguish pending-zone layout from ready-zone layout so the page emphasis matches the domain’s actual state.
- Keep proof first, logs second, analytics third in the zone-detail narrative.
- Split analytics presentation into a lighter embedded confirmation panel and a fuller standalone analytics page shell.
- Continue reducing excessive height in proof/log surfaces so the page reads as a workflow, not a stack of giant cards.

**Patterns to follow:**
- Preserve the existing route data loading in `app/domains/[domainId]/page.tsx`.
- Preserve the evidence truth model documented in `docs/demo/logs-and-evidence-guide.md`.

**Test scenarios:**
- Happy path: a ready zone foregrounds proof and confirmation while keeping config and analytics secondary.
- Happy path: a pending zone foregrounds the blocker and next setup step rather than presenting all panels as equal peers.
- Happy path: standalone analytics presents report framing, while embedded analytics reads as contextual confirmation rather than a duplicate page.
- Edge case: `updating` and `degraded` freshness states remain explicit in both standalone and embedded contexts without overwhelming the page.
- Error path: failed or blocked proof remains localized and readable in the denser proof panel.
- Responsive: zone detail stacks gracefully on mobile with the active revision/state and proof action still visible near the top.
- Integration: proof results still correlate with edge/API logs and analytics summaries after the layout split.

**Verification:**
- Zone detail feels like an operational workspace with clear task order, and analytics has a distinct page role versus embedded confirmation role.

- [ ] **Unit 5: Add targeted UI coverage and browser verification for the new grammar**

**Goal:** Lock in the new IA and visual hierarchy so future tweaks do not regress the page roles.

**Requirements:** R2, R3, R4, R6

**Dependencies:** Unit 1, Unit 2, Unit 3, Unit 4

**Files:**
- Create: `tests/demo/home-page.test.tsx`
- Create: `tests/auth/login-form.test.tsx`
- Create: `tests/demo/zone-detail-shell.test.tsx`
- Create: `tests/demo/analytics-page-shell.test.tsx`
- Modify: `tests/demo/dashboard-flow.test.tsx`
- Modify: `tests/demo/new-domain-form.test.tsx`
- Modify: `tests/demo/request-proof-panel.test.tsx`
- Modify: `tests/demo/browser_smoke.py`

**Approach:**
- Add direct tests for the signed-out root, signed-in root, login redirect behavior, analytics page shell, and zone-detail hierarchy.
- Extend the existing browser smoke flow so the key pages can be sanity-checked visually after styling changes.
- Keep the tests focused on page role, CTA presence, hierarchy, and state-driven branch rendering rather than brittle snapshot strings.

**Patterns to follow:**
- Follow the current Vitest + Testing Library style in `tests/demo/dashboard-flow.test.tsx` and `tests/demo/new-domain-form.test.tsx`.
- Reuse the current browser smoke entry point in `tests/demo/browser_smoke.py` instead of inventing a separate visual harness first.

**Test scenarios:**
- Happy path: signed-out root, signed-in root, sites index, new-zone form, analytics page, and zone detail all render their intended dominant action or content block.
- Edge case: auth redirect with a valid internal `next` target returns the user to the intended destination.
- Edge case: empty-state and populated-state overview layouts both render with the correct CTA priority.
- Error path: analytics degraded state and login validation error remain readable in the updated visual system.
- Integration: browser smoke exercises the main route flow (`/` -> `/login` -> `/domains/new` -> `/domains/[domainId]` -> `/analytics`) without obvious hierarchy regressions.

**Verification:**
- The most important page-role and auth-handoff decisions are covered by tests, and visual regressions become easier to catch before future tweaks land.

## System-Wide Impact

- **Interaction graph:** signed-out `/` -> `/login` -> signed-in `/` becomes the canonical entry chain, while `/domains`, `/domains/new`, `/domains/[domainId]`, and `/analytics` remain protected product routes under the same shell.
- **Error propagation:** login validation and degraded analytics states must remain readable after the styling changes; visual refinement must not bury or flatten error states.
- **State lifecycle risks:** the same domain state still drives overview badges, setup emphasis, proof panels, and analytics confirmation. The plan must preserve honest state transitions across all of them.
- **API surface parity:** no backend API contracts are expected to change. Redirect and auth-intent behavior should stay inside the Next.js app layer.
- **Integration coverage:** auth handoff, overview-vs-sites differentiation, and analytics page-vs-panel differentiation all need explicit coverage because component-level tests alone will not prove the user journey.
- **Unchanged invariants:** request proof remains immediate truth, logs explain it, analytics confirms it, and protected routes still require a valid session.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| The redesign chases screenshots instead of clarifying the product flow | Anchor every page to a single job and preserve the existing `config -> proof -> logs -> analytics` narrative. |
| `/` and `/domains` remain visually different but still conceptually duplicate each other | Resolve route roles first, then split or retarget shells before polishing typography and spacing. |
| A `next` parameter introduces open-redirect risk | Restrict redirects to internal paths and test invalid targets explicitly. |
| Styling changes create more CSS drift instead of less | Consolidate primitives in `app/globals.css` before adding new page-level selectors. |
| Analytics still feels redundant after the pass | Separate standalone page framing from embedded confirmation presentation and test both roles directly. |

## Documentation / Operational Notes

- Update any screenshots or walkthrough notes that still describe `/domains` as the first authenticated surface if the redirect target moves to `/`.
- Refresh user-facing demo docs if page labels or narrative order change materially, especially `docs/demo/presentation-readiness-checklist.md` and README sections that describe the product flow.
- Keep copy changes within the honesty guardrails from `docs/demo/demo-claims-guardrails.md`.

## Sources & References

- Related plan: `docs/plans/2026-04-01-001-feat-simplify-onboarding-flow-plan.md`
- Related plan: `docs/plans/2026-03-31-feat-real-user-cdn-onboarding-flow-plan.md`
- Related docs: `docs/demo/logs-and-evidence-guide.md`
- Related docs: `docs/demo/presentation-readiness-checklist.md`
- Related docs: `docs/demo/demo-claims-guardrails.md`
- External reference: `https://langfuse.com/` (reviewed 2026-04-01 via direct fetch and user screenshots)
