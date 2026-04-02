# Presentation readiness checklist

- Reset the demo before the meeting.
- Reseed a ready domain or create one from `/domains/new`.
- Confirm the zone detail page shows origin, DNS records, readiness contract, and the real proxied request path URL.
- Send one baseline request and confirm proof appears.
- Enable cache and confirm `MISS` then `HIT`.
- Confirm Rust edge logs and Go API logs both correlate by request ID.
- Confirm analytics freshness is understood before the meeting:
  - `Live`: ClickHouse-backed summary is current.
  - `Updating`: analytics are lagging behind proof/logs.
  - `Degraded`: ClickHouse is unavailable or falling back; do not overclaim.
- Keep the main narrative anchored on `config -> proof -> logs -> analytics`.
