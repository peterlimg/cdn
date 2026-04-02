# Runbook

## Start the demo locally

```bash
docker compose up postgres redis clickhouse -d
npm install
npm run dev
```

This starts:

- Next.js UI on `http://127.0.0.1:3000`
- Go API/control service on `http://127.0.0.1:4001`
- Rust edge service on `http://127.0.0.1:4002`

The local dev path now still depends on PostgreSQL, Redis, and ClickHouse running first. Docker Compose is the simplest way to provide those backing services.

Service endpoints are now environment-aware. Local development still defaults to `127.0.0.1`, while Docker Compose uses container service names.

## Start the demo with Docker Compose

Export demo-only secrets before starting Compose:

```bash
export DEMO_RESET_TOKEN=replace-with-demo-reset-token
export INTERNAL_API_TOKEN=replace-with-internal-api-token
```

```bash
docker compose up --build
```

This starts the same demo stack with an Nginx ingress in front of the existing three services:

- Nginx ingress on `http://127.0.0.1:8080`
- Next.js UI on `http://127.0.0.1:3000`
- Go API/control service on the internal Compose network
- PostgreSQL on the internal Compose network
- Redis on the internal Compose network
- Rust edge service on the internal Compose network

Compose waits for the Go API health check before starting the Rust edge, waits for both backend services before starting the UI, and starts Nginx after the UI and edge are available.

The Rust container now builds without system OpenSSL by using `reqwest` with `rustls`, so the Compose path does not rely on Alpine-specific OpenSSL packages.

Open `http://127.0.0.1:8080` for the ingress-backed demo path. The UI is still also directly reachable on `http://127.0.0.1:3000` for debugging.

The Go control plane now persists domain, request, and log state in PostgreSQL. Restarting the API container no longer clears domain or revision data by itself.
The main proof flow in Compose now uses the ingress-backed edge route, so request IDs can be correlated from ingress into Rust proof and Go logs.

## Health checks

```bash
curl -I http://127.0.0.1:8080
curl -I http://127.0.0.1:3000
curl http://127.0.0.1:8080/edge/health
docker compose exec api wget -qO- http://127.0.0.1:4001/health
docker compose exec postgres pg_isready -U postgres -d cdn_demo
docker compose exec redis redis-cli ping
```

## Reset the demo

```bash
curl -X POST http://127.0.0.1:3000/api/reset -H "x-reset-token: $DEMO_RESET_TOKEN"
```

That reset now clears PostgreSQL-backed control-plane tables, ClickHouse-backed analytics events, Redis-backed rate-limit counters, and Rust edge cache marker files.

## Reseed the default demo domain

```bash
curl -X POST http://127.0.0.1:3000/api/reseed \
  -H "x-reset-token: $DEMO_RESET_TOKEN" \
  -H "content-type: application/json" \
  -d '{"mode":"ready"}'
```

That recreates the default ready-domain baseline without using the UI shortcut route.

## Main walkthrough

1. Open `/domains`
2. Create a ready domain
3. Open the zone detail page
4. Send one baseline request
5. Enable edge cache
6. Send repeated requests to show `MISS` then `HIT`
7. Open Rust edge logs
8. Open Go API logs
9. Open analytics or keep the analytics card visible in zone detail
10. Continue until quota is reached

The default domain rate limit is intentionally set above the quota walkthrough so the main demo reliably reaches `BLOCKED_QUOTA` first. To show rate limiting separately, reseed a fresh domain and send more than 10 requests inside one 60-second window.

## Real proxied path check

After reseeding a ready domain, you can verify the real edge proxy path directly. Use the zone's configured request path or health check path instead of assuming a shared demo asset path:

```bash
curl -i "http://127.0.0.1:3000/api/proxy-check?domainId=<zone-id>&path=%2F"
```

The first request should return `X-Cache-Status: BYPASS` or `MISS` depending on cache policy. A repeated request with cache enabled should return `X-Cache-Status: HIT`.

The same proxied path URL is shown in the zone detail flow through the configured route hint, so you do not need to rebuild it manually during a walkthrough. The UI-hosted proxy-check route works both on the direct UI port and through ingress-backed demos.

## Useful logs during local development

- `/tmp/cdn-ui.log`
- `/tmp/cdn-go.log`
- `/tmp/cdn-rust.log`

## Failure guidance

- If the UI is up but no domain data appears, check the Go API health endpoint first.
- If the Go API does not start, check PostgreSQL health and container logs first.
- If policy publish works but request proof fails, check the Rust edge health endpoint and `/tmp/cdn-rust.log`.
- If proof works but analytics or API logs look stale, check `/tmp/cdn-go.log`.
- If Docker Compose is running but the UI cannot reach the backend services, check the container health state with `docker compose ps`.
- If the ingress route fails but the UI works directly on `:3000`, inspect the Nginx container logs and `nginx/nginx.conf`.
