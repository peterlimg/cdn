# Service map

## Runtime split

- `app/` (Next.js / TypeScript)
  Buyer-facing dashboard UI and thin route proxies.

- `api-go/` (Golang)
  Control-plane authority for domains, policy revisions, analytics summaries, reset flow, and service-log retrieval.

- `edge-rust/` (Rust)
  Edge request path for cache decisioning, quota-aware request proof, and structured edge log emission.

## Demo request path

1. User changes configuration in the Next.js dashboard.
2. Next.js calls the Go API for domain/config state changes.
3. User sends a request through the Rust edge.
4. Rust edge fetches edge context from Go.
5. Rust edge evaluates bypass, miss, hit, or blocked state.
6. Rust edge sends proof + edge logs back to Go for aggregation.
7. Next.js renders request proof, edge logs, API logs, and analytics from those service-backed responses.

## Truth boundaries

- Request proof: immediate source of truth for one request.
- Rust edge logs: why the edge made the request decision.
- Go API logs: why the control plane participated, or why it was expected to be quiet.
- Analytics: buyer-facing confirmation layer derived from the service-backed event stream.
