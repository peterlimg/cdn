# Runbook

## Start the demo locally

```bash
npm install
npm run dev
```

This starts:

- Next.js UI on `http://127.0.0.1:3000`
- Go API/control service on `http://127.0.0.1:4001`
- Rust edge service on `http://127.0.0.1:4002`

Service endpoints are now environment-aware. Local development still defaults to `127.0.0.1`, while Docker Compose uses container service names.

## Start the demo with Docker Compose

```bash
docker compose up --build
```

This starts the same demo stack with an Nginx ingress in front of the existing three services:

- Nginx ingress on `http://127.0.0.1:8080`
- Next.js UI on `http://127.0.0.1:3000`
- Go API/control service on `http://127.0.0.1:4001`
- PostgreSQL on `http://127.0.0.1:5432`
- Rust edge service on the internal Compose network

Compose waits for the Go API health check before starting the Rust edge, waits for both backend services before starting the UI, and starts Nginx after the UI and edge are available.

Open `http://127.0.0.1:8080` for the ingress-backed demo path. The UI is still also directly reachable on `http://127.0.0.1:3000` for debugging.

The Go control plane now persists domain, request, and log state in PostgreSQL. Restarting the API container no longer clears domain or revision data by itself.

## Health checks

```bash
curl -I http://127.0.0.1:8080
curl http://127.0.0.1:4001/health
curl http://127.0.0.1:4002/health
curl -I http://127.0.0.1:3000
docker compose exec postgres pg_isready -U postgres -d cdn_demo
```

## Reset the demo

```bash
curl -X POST http://127.0.0.1:3000/api/reset
```

That reset now clears the PostgreSQL-backed control-plane tables as well as the in-memory request state in the running services.

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
