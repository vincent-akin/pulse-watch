# PulseWatch Postman Collection

`PulseWatch.postman_collection.json` — 77 requests across 13 folders covering the entire API
(Auth, Organizations & Members, Monitors, Health Checks, Incidents, SSL Certificates & Domains,
Status Pages, Notification Channels & Notifications, API Keys, Audit Logs, Analytics, Billing, Misc).

`PulseWatch.postman_environment.json` — sets `baseUrl` to `http://localhost:4000`; swap it for a
deployed URL as needed.

## Import

Postman → **Import** → drag in both JSON files → select the **PulseWatch — Local** environment in
the top-right environment picker.

## Running it end to end

The collection is designed to be run top-to-bottom on a fresh backend (or after
`npm run seed:demo`):

1. **Auth → Login** — pre-filled with the seeded admin demo account. On success, a test script
   automatically stores `accessToken` / `refreshToken` / `userId` as collection variables, so every
   later request's Bearer auth "just works" without manual copy-pasting.
2. **Organizations & Members → Create Organization** — stores `organizationId` and its `ETag`.
   (Skip this and just set `organizationId` manually to the seeded "Demo Organization" if you ran
   `npm run seed:demo` and want to use the pre-populated sample monitors instead.)
3. **Monitors → Create Monitor** — stores `monitorId` and its `ETag`.
4. Everything else (Health Checks, Incidents, SSL Certificates, Status Pages, Notification
   Channels, API Keys, Analytics, Billing) reads from those stored variables.

Requests that return an `ETag` (Organizations, Monitors, Notification Channels, Status Pages) wire
it into the corresponding `PATCH` request's `If-Match` header automatically via collection
variables — re-run the `GET`/create request first if you get a `412 Precondition Failed`.

## Regenerating

The collection is generated from `generate_postman.py` rather than hand-edited, to keep ~80
requests consistent and avoid hand-typo'd JSON. Edit the endpoint list in that script and re-run:

```bash
python3 generate_postman.py
```
