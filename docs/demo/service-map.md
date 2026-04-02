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
4. User can send a request to the Rust edge either through the generic Nginx ingress route or through a node-targeted verification route.
5. Nginx forwards trusted request metadata and request ID headers when it is in the path.
6. Rust edge fetches edge context from Go and acknowledges its active revision for the targeted zone.
7. Rust edge evaluates pending, WAF, rate-limit, quota, bypass, miss, hit, or blocked state.
8. On bypass or miss, Rust fetches the demo origin asset over HTTP and can cache the response body locally.
9. Rust edge sends node-attributed proof + edge logs back to Go for aggregation.
10. Next.js renders request proof, edge logs, API logs, rollout state, and analytics from those service-backed responses.

## Real proxy route

- The Rust edge now also exposes a real proxied asset route for rehearsal traffic.
- Through ingress, a presenter can hit `GET /edge/proxy/assets/demo.css?domainId=<zone-id>` and receive the actual response body from the default verification edge.
- For a specific node, a presenter can hit `GET /edge-nodes/<node-id>/proxy/assets/demo.css?domainId=<zone-id>`.
- The response includes `X-Request-Id`, `X-Trace-Id`, and `X-Cache-Status` headers so the proxied response can still be correlated back to proof and logs.

## Ingress boundary

- Nginx is currently an ingress helper for local deployment and future TLS termination.
- Rust remains the owner of request-path behavior, cache decisions, and edge evidence.
- Request IDs are accepted from Nginx when present. Rust remains authoritative for proof records emitted into the demo evidence flow.

## Truth boundaries

- Request proof: immediate source of truth for one request.
- Edge rollout status: control-plane summary of which targeted nodes have acknowledged the active revision.
- Rust edge logs: why the edge made the request decision.
- Go API logs: why the control plane participated in config lookup, rate limiting, ingest, and analytics behavior.
- Analytics: buyer-facing confirmation layer derived from the service-backed event stream.
