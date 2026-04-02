# Demo claims guardrails

## Allowed claims

- This demo proves one control-plane change causing one observable edge outcome.
- Domain onboarding is shown as product shape, while live traffic runs through a pre-verified demo hostname.
- Analytics are derived from request events and serve as confirmation, not the only proof.
- The quota-reached state is a real demo behavior on the request path.
- The long-term product architecture is expected to move toward Rust edge and Go control-plane services.
- Nginx is used as temporary ingress and future TLS termination support, while Rust remains the edge runtime that makes request decisions.
- Redis-backed counters are used for demo rate limiting. The default walkthrough keeps the rate limit above the quota path so quota remains the primary scripted block, and rate-limited requests still count toward limit windows without consuming quota bytes.
- Internal control-plane endpoints are demo-internal only. They are not part of the buyer-facing API surface.
- The local demo can show one zone targeted to multiple named edge nodes with per-node rollout visibility.

## Forbidden claims

- Do not claim this is a production-ready global CDN.
- Do not claim managed DNS is fully implemented.
- Do not claim enterprise WAF, bot management, or DDoS mitigation exists.
- Do not imply BTCPay billing or customer balance top-ups are implemented unless that work is actually added later.
- Do not describe seeded or pre-verified states as if they were discovered live during the demo.
- Do not describe Nginx as the CDN edge logic layer. It is only ingress and proxy support in this phase.
- Do not claim that one successful generic proof request means every targeted edge node is already serving traffic.

## Standard answers

- `How many regions do you have today?`
  This demo focuses on the control/data-plane loop, not production POP count. The named edge nodes in the local stack show placement and rollout shape, not a claim of current global footprint.

- `Does one green proof mean every edge is live?`
  No. A proof row is evidence for one request on one edge node. The rollout card shows which targeted nodes have acknowledged the active revision across the selected scope.

- `Is this domain really being verified live?`
  The onboarding UX is real product shape. The live traffic portion intentionally uses a pre-verified demo domain so the request-path proof is deterministic during the pitch.

- `Are those analytics real time?`
  They are derived from the request events generated in the demo. The proof panel is the immediate source of truth, and analytics are the buyer-facing confirmation layer.

- `What happens after quota is reached?`
  The edge blocks additional traffic on the free plan. In the future product, that state would connect to account balance and billing flows.

- `Why not show WAF too?`
  The first wedge is caching because it demonstrates core CDN value most clearly. Security controls would be the next layer after the request-proof loop is in place.

- `Why is Nginx here if Rust is the edge?`
  Nginx is handling ingress concerns for the demo environment, such as proxying and future TLS termination. The actual request-path decisioning still happens in Rust.
