# Reset And Reseed

## Purpose

This demo reset path restores the Go control plane and recent request evidence to a known empty baseline so rehearsals are deterministic.

## Reset command

```bash
curl -X POST http://127.0.0.1:3000/api/reset
```

## What reset clears today

- PostgreSQL-backed domain records
- PostgreSQL-backed request events
- PostgreSQL-backed service logs
- In-memory Go counters and request slices in the running process

## What reset does not clear today

- Rust local cache marker files under `/tmp/edge-cache-*`

If you need a fully cold cache rehearsal, remove those files manually before restarting the flow.

## Recommended reseed flow

1. Run the reset endpoint.
2. Create a ready domain from `/domains/new`.
3. Send one baseline request.
4. Enable cache.
5. Send two repeated requests to restore `MISS` then `HIT`.

## Compose notes

- PostgreSQL data persists in the `postgres-data` volume.
- The reset endpoint clears the demo tables without requiring volume deletion.
- Delete the volume only if you want to fully destroy the local database state:

```bash
docker compose down -v
```
