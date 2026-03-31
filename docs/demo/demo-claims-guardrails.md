# Demo claims guardrails

## Allowed claims

- This demo proves one control-plane change causing one observable edge outcome.
- Domain onboarding is shown as product shape, while live traffic runs through a pre-verified demo hostname.
- Analytics are derived from request events and serve as confirmation, not the only proof.
- The quota-reached state is a real demo behavior on the request path.
- The long-term product architecture is expected to move toward Rust edge and Go control-plane services.

## Forbidden claims

- Do not claim this is a production-ready global CDN.
- Do not claim managed DNS is fully implemented.
- Do not claim enterprise WAF, bot management, or DDoS mitigation exists.
- Do not imply BTCPay billing or customer balance top-ups are implemented unless that work is actually added later.
- Do not describe seeded or pre-verified states as if they were discovered live during the demo.

## Standard answers

- `How many regions do you have today?`
  This demo focuses on the control/data-plane loop, not production POP count. Regional rollout is part of the planned architecture, not a claim of current global footprint.

- `Is this domain really being verified live?`
  The onboarding UX is real product shape. The live traffic portion intentionally uses a pre-verified demo domain so the request-path proof is deterministic during the pitch.

- `Are those analytics real time?`
  They are derived from the request events generated in the demo. The proof panel is the immediate source of truth, and analytics are the buyer-facing confirmation layer.

- `What happens after quota is reached?`
  The edge blocks additional traffic on the free plan. In the future product, that state would connect to account balance and billing flows.

- `Why not show WAF too?`
  The first wedge is caching because it demonstrates core CDN value most clearly. Security controls would be the next layer after the request-proof loop is in place.
