# Logs and evidence guide

## What each surface proves

### Request proof
- Best for the buyer.
- Shows `request_id`, `trace_id`, cache status, revision, bytes served, and quota state.
- Answer to: `What happened for this request?`

### Rust edge logs
- Best for explaining the edge path.
- Shows why the edge bypassed, cached, hit, or blocked.
- Answer to: `Why did the edge make that decision?`

### Go API logs
- Best for explaining control-plane participation.
- Shows config lookup, policy publish, event ingest, and dashboard summary behavior.
- Answer to: `Where did the API service participate?`

## Expected-empty cases

- A cache hit may not generate new meaningful Go API activity for that exact request beyond prior config lookup or prior ingest. The UI should explain this as expected-empty, not as a missing system.

## Correlation keys

- `request_id`: ties one visible proof row to the service evidence.
- `trace_id`: ties the same request across proof, edge logs, and API logs.
- `revision_id`: explains which config version was active.
