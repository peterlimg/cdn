# Service map

## Runtime split

- `nginx/` (Nginx)
  Temporary ingress boundary for local demos. It can terminate TLS later and forwards trusted request context to the Rust edge or dashboard, but it does not own CDN logic.

- `app/` (Next.js / TypeScript)
  Buyer-facing dashboard UI and thin route proxies.

- `api-go/` (Golang)
  Control-plane authority for domains, policy revisions, analytics summaries, reset flow, and service-log retrieval.

- `edge-rust/` (Rust)
  Edge request path for cache decisioning, quota-aware request proof, real origin fetches, and structured edge log emission.

## Demo request path

1. User opens the dashboard through Nginx or directly through the UI service.
2. User changes configuration in the Next.js dashboard.
3. Next.js calls the Go API for domain/config state changes.
4. User can send a request to the Rust edge either directly or through the Nginx ingress route.
5. Nginx forwards trusted request metadata and request ID headers when it is in the path.
6. Rust edge fetches edge context from Go.
7. Rust edge evaluates pending, WAF, rate-limit, quota, bypass, miss, hit, or blocked state.
8. On bypass or miss, Rust fetches the demo origin asset over HTTP and can cache the response body locally.
9. Rust edge sends proof + edge logs back to Go for aggregation.
10. Next.js renders request proof, edge logs, API logs, and analytics from those service-backed responses.

## Ingress boundary

- Nginx is currently an ingress helper for local deployment and future TLS termination.
- Rust remains the owner of request-path behavior, cache decisions, and edge evidence.
- Request IDs are accepted from Nginx when present. Rust remains authoritative for proof records emitted into the demo evidence flow.

## Truth boundaries

- Request proof: immediate source of truth for one request.
- Rust edge logs: why the edge made the request decision.
- Go API logs: why the control plane participated, or why it was expected to be quiet.
- Analytics: buyer-facing confirmation layer derived from the service-backed event stream.
