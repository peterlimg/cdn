---
date: 2026-04-02
topic: authenticated-origin-traffic
---

# Authenticated Origin Traffic

## Problem Frame
The current CDN demo cleanly supports the product's main static-site story, but it does not yet support authenticated sites whose origin behavior depends on end-user login state or credentials. That means a site that requires browser cookies, bearer tokens, basic auth, query-string state, or auth-establishing response headers cannot safely or correctly run through the current edge flow.

This is not just an open question. The current runtime has a verified gap between "operator login to the dashboard" and "credentialed end-user traffic through the CDN." The operator dashboard session exists today, but credentialed origin traffic is not yet serviced end-to-end.

This investigation applies to the Rust edge proxy path. The TypeScript demo edge/origin services remain static/demo-only and are not candidates for authenticated-origin support in their current form.

## Requirements

**Current Support Boundary**
- R1. The product must treat authenticated or credentialed site traffic as unsupported in the current demo/runtime unless and until explicit support is added.
- R2. Product copy, demos, and walkthroughs must not imply that logged-in applications already work correctly through the CDN edge.
- R3. The current Rust edge proxy path must not be presented as authenticated pass-through support. It currently drops request and response semantics that authenticated origins rely on.

**Future Support Invariants**
- R4. If the product adds support for authenticated site traffic, it must preserve the original request semantics needed by the origin, including method, full URL semantics, body, and the defined credential/header contract.
- R5. If the product adds support for authenticated site traffic, it must preserve the origin response semantics needed by the browser, including status codes and auth-establishing or session-mutating headers.
- R6. Credentialed or personalized responses must never be shared across users through edge caching.
- R7. Protected traffic must default to bypass or no-store behavior unless a narrower safe caching model is explicitly designed, reviewed, and verified.

**Product Positioning**
- R8. The default first-success story should remain public static-origin traffic unless the authenticated-origin path is explicitly designed, implemented, and verified.
- R9. If mixed-mode support becomes necessary, the first productized step should prefer "public routes can use CDN caching, protected routes bypass shared cache" before attempting full authenticated caching support.

## Success Criteria
- Repo docs and product claims clearly distinguish dashboard/operator auth from end-user auth passing through authenticated sites.
- Another engineer can inspect the requirements and understand that this is a real limitation, not an already-fixed feature.
- A follow-on planning pass can decide whether to keep this out of scope, add an explicit protected-route bypass mode, or pursue fuller authenticated pass-through support.

## Scope Boundaries
- This does not require changing the current simplified dashboard sign-in flow.
- This does not require building full dynamic-site or application-delivery support in this brainstorm.
- This does not claim that the current static-origin demo is invalid; it narrows the supported traffic shape honestly.

## Key Decisions
- Current status: not fixed. The present edge/runtime should be treated as public-static-first, not credential-aware.
- Product framing: this is a real product limitation for logged-in sites, but it is not a contradiction of the current static-site demo scope.
- Future direction: if we support this later, the work must start from correctness and cache safety, not from reusing the current static asset proxy path as-is.
- Near-term default: clarify the public-static-only support boundary first; if demand requires mixed-mode sites, prefer protected-route bypass before broader authenticated caching support.

## Dependencies / Assumptions
- Assumption: the current demo continues to prioritize static-origin onboarding and proof flows as the primary product story.
- Dependency: any future authenticated-origin support needs an explicit header contract, response passthrough contract, and cache-safety model before it can be called supported.

## Outstanding Questions

### Deferred to Planning
- [Affects R4-R7][Technical] Should authenticated traffic be handled as full proxy pass-through, route-level cache bypass, or an explicit origin-protection mode?
- [Affects R6-R7][Technical] What cache-key and response-classification rules are required to prevent personalized response leakage?
- [Affects R4-R5][Needs research] Which request and response headers should be forwarded, suppressed, regenerated, or normalized in the supported model?
- [Affects R8-R9][Product] Should the product surface this as "static sites only" for now, or as "public routes supported, protected routes require bypass mode" once planned?

## Next Steps
-> /ce:plan for structured implementation planning if you want to close this gap or define the supported product boundary more explicitly.
