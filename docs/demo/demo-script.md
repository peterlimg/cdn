# Northstar CDN demo script

## Main walkthrough

1. Start on `/domains` and explain the runtime split: Next.js dashboard, Go API/control service, and Rust edge service.
2. Create a `ready` demo domain. Call out that the onboarding UI now creates the control-plane record explicitly, and that `ready` is the demo readiness mode used to allow immediate proof in review.
3. Open the zone detail page. Point out the explicit config sections: origin target, DNS records, readiness contract, active revision, request route hint, and the real proxied request-path check URL.
4. Use the **Request proof** tab and send one request through the edge. The first proof should show `BYPASS` under the baseline revision.
5. Switch briefly to **Go API logs** and explain that the control plane served config and ingested the event for that request.
6. Enable the cache policy and wait for the edge-apply confirmation banner.
7. Send the same request twice. The first request should show `MISS`; the second should show `HIT` under the new revision.
8. Open **Rust edge logs** to show why the edge served, cached, or blocked the request. Open **Go API logs** again to explain the control-plane work that still accompanies config lookup, rate limiting, and evidence ingest.
9. Move attention to the analytics cards and cache value panel. Explain that analytics are derived from request events rather than edited independently in the UI, and that `Updating` or `Degraded` should be called out explicitly when present.
10. Continue sending requests until the free-plan quota is reached. Show that the next request is blocked with the same quota state reflected in proof and analytics.
11. Roll the cache policy back to baseline. Explain that the active revision returns to the uncached path and the next request proves the reversal.

The default walkthrough is tuned so quota is reached before rate limiting. If you want to show the Redis-backed rate-limit path, reset and reseed a fresh ready domain, then burst more than 10 requests within 60 seconds.

## Alternate walkthroughs

- `pending setup`: create a `pending` demo domain to show onboarding instructions without claiming live traffic.
- `service logs`: use the Rust edge log tab to explain request decisions and the Go API log tab to explain control-plane/config activity.
- `analytics updating`: explain that request proof remains the immediate source of truth if derived analytics are delayed.
- `quota reached`: use the blocked state to transition naturally into the future BTCPay credit-top-up conversation without claiming it is implemented today.

## Storyboard

| Screen | Primary message | Single proof point | Next transition |
| --- | --- | --- | --- |
| `/domains` | This is the main control-plane entry point | Ready vs pending domain creation + runtime split | Create a ready zone |
| `/domains/[id]` config | Domain setup is explicit, not implied | DNS records + origin + readiness contract | Show request route + revision |
| `/domains/[id]` proof | The Rust edge is making real request decisions | Request ID + cache status + trace ID | Open logs |
| `/domains/[id]` edge logs | The edge explains cache/serve/block outcomes | Structured Rust log entry | Open API logs |
| `/domains/[id]` API logs | The Go service explains config lookup, rate limiting, and ingest activity | Structured Go log entry | Open analytics |
| `/analytics` | Dashboard metrics confirm edge behavior | Cache value + quota state | Reach quota or roll back |
| Rollback | Config can be reversed safely | Active revision returns to baseline | End on operational confidence |
