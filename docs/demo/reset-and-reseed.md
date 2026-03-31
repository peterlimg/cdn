# Reset And Reseed

## Purpose

This demo reset path restores the Go control plane and recent request evidence to a known empty baseline so rehearsals are deterministic.

## Reset command

Export the demo-only reset and internal tokens before using reset or reseed:

```bash
export DEMO_RESET_TOKEN=replace-with-demo-reset-token
export INTERNAL_API_TOKEN=replace-with-internal-api-token
```

```bash
curl -X POST http://127.0.0.1:3000/api/reset -H "x-reset-token: $DEMO_RESET_TOKEN"
```

Reset now fails closed if PostgreSQL, Redis, or the Rust cache reset cannot be completed.

## What reset clears today

- PostgreSQL-backed domain records
- PostgreSQL-backed request events
- PostgreSQL-backed service logs
- Redis-backed rate-limit counters
- Rust local cache marker files under `/tmp/edge-cache-*`
- In-memory Go counters and request slices in the running process

## Recommended reseed flow

1. Run the reset endpoint.
2. Recreate the default ready domain non-interactively:

```bash
curl -X POST http://127.0.0.1:3000/api/reseed \
  -H "x-reset-token: $DEMO_RESET_TOKEN" \
  -H "content-type: application/json" \
  -d '{"mode":"ready"}'
```

3. Send one baseline request.
4. Enable cache.
5. Send two repeated requests to restore `MISS` then `HIT`.

Use `{"mode":"pending"}` to reseed the pending-domain walkthrough instead.

## Compose notes

- PostgreSQL data persists in the `postgres-data` volume.
- The reset endpoint clears the demo tables without requiring volume deletion.
- Delete the volume only if you want to fully destroy the local database state:

```bash
docker compose down -v
```
