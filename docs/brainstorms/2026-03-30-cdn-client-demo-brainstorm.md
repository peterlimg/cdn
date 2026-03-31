---
date: 2026-03-30
topic: cdn-client-demo
---

# CDN Client Demo

## What We're Building
Build a pitch demo for a small but credible CDN product, aimed at winning a client who wants a long-term partner to build a Cloudflare/BunnyCDN-style platform in stages. The demo should not try to fake a full CDN company. It should show one believable end-to-end slice of the product: a customer can add a domain, configure core CDN behavior, send traffic through the platform, and immediately see the operational and business impact in analytics.

The chosen direction is a balanced hybrid demo. It combines a control-plane surface with a live edge story and an analytics outcome. The control plane shows that the product can onboard and manage domains. The live edge flow shows that traffic can be cached and filtered. The analytics view shows why the platform matters: bandwidth usage, cache hit ratio, regional traffic, and free-plan quota consumption.

## Why This Approach
This client is asking for more than a landing page or SaaS dashboard. They want confidence that the developer understands CDN fundamentals, system boundaries, rollout sequencing, and product constraints. A frontend-only mockup is too weak. A deep technical prototype alone is too narrow and harder to sell quickly. The balanced hybrid keeps scope small while proving real understanding.

This approach also matches the strongest parts of the brief. The client explicitly cares about domains, DNS, caching, WAF, analytics, admin operations, free-plan limits, and future regional scale. The demo should touch those ideas without claiming that all production-hard problems are already solved. It should feel like the first shippable milestone of a serious platform rather than a concept deck or an overbuilt prototype.

## Key Decisions
- Focus on one narrow but believable customer flow: add a domain, apply simple cache/WAF settings, send traffic, then inspect analytics and quota usage. This is the clearest way to prove product and infrastructure understanding.
- Show analytics as a first-class part of the story, not a side screen. For this client, analytics validates that the edge behavior, metering, and free-plan business model connect together.
- Keep WAF and DNS basic in the demo. The goal is to show product shape and sound judgment, not to imply Cloudflare-level feature depth on day one.
- Include free-plan quota visibility in the demo. The brief makes automatic stop-at-limit behavior a core commercial requirement, so the demo should make that constraint visible and understandable.
- Avoid pitching a full global network. The demo should reference 2-3 starter regions and emphasize staged rollout rather than pretending the platform already has mature worldwide infrastructure.

## Open Questions
- Should the demo include a visible BTCPay-style balance top-up screen, or keep billing as a follow-on conversation after the core CDN flow lands?
- Should DNS be shown as lightweight record management for onboarding, or as the beginning of a fuller managed DNS product?
- Does the client respond better to a polished customer-facing walkthrough or to a more technical architecture-backed demo with supporting diagrams?
- Should the quota exhaustion state be shown directly in the demo, or only discussed as part of the product rules and admin controls?

## Next Steps
Proceed to planning for a right-sized demo that emphasizes technical credibility. The plan should define the exact screens, the live flow, the minimum real backend behavior required, and the fastest path to a convincing presentation.

-> `/workflows:plan` for implementation details
