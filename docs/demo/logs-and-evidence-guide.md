# Logs and evidence guide

## What each surface proves

### Request proof
- Best for quick verification.
- Shows `request_id`, `trace_id`, cache status, revision, bytes served, and quota state.
- Answer to: `What happened for this request?`

### Rust edge logs
- Best for explaining the edge path.
- Shows why the edge bypassed, fetched from origin, cached, hit, or blocked.
- Answer to: `Why did the edge make that decision?`

### Go API logs
- Best for explaining control-plane participation.
- Shows config lookup, policy publish, event ingest, and dashboard summary behavior.
- Answer to: `Where did the API service participate?`

### Analytics
- Best for readable confirmation, not first-response debugging.
- Now intended to come from ClickHouse-backed append-only request events when available.
- If freshness is `updating` or `degraded`, prefer request proof and service logs as the immediate truth.

## Correlation keys

- `request_id`: ties one visible proof row to the service evidence.
- `trace_id`: ties the same request across proof, edge logs, and request-scoped API logs such as config lookup, rate limiting, and ingest.
- `revision_id`: explains which config version was active.
