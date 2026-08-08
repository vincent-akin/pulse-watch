# API Reference (worked examples)

This complements `API_Specification.md` (the contract) with concrete request/response examples
against the actual implementation, for developers integrating against a running instance. A ready-to-run
Postman collection covering every endpoint lives in `../postman/`.

Base URL used below: `http://localhost:4000/api/v1` (local dev via `docker compose up`).

All responses use the standard envelope:

```json
{ "success": true, "message": "...", "data": {}, "meta": {} }
```

---

## Authentication

### Register

```http
POST /auth/register
Content-Type: application/json

{
  "email": "jane@example.com",
  "password": "SuperSecret123!",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

`201` — a verification email is sent (or dry-run logged if `SENDGRID_API_KEY` isn't set).

### Login

```http
POST /auth/login
Content-Type: application/json

{ "email": "jane@example.com", "password": "SuperSecret123!" }
```

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": { "id": "...", "email": "jane@example.com", "firstName": "Jane", "lastName": "Doe" },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "9f2a1c...",
    "expiresIn": 900
  }
}
```

Use `demo` credentials seeded by `npm run seed:demo` if you just want to explore — see the root
README for the full list.

### Refresh

```http
POST /auth/refresh-token
Content-Type: application/json

{ "refreshToken": "9f2a1c..." }
```

Rotates the refresh token (the old one is revoked). Presenting an already-used refresh token
revokes the *entire* session as a reuse-detection safeguard — you'll need to log in again.

### Current user

```http
GET /auth/me
Authorization: Bearer <accessToken>
```

---

## Organizations

Every request below `/monitors`, `/incidents`, etc. needs an organization context via
`X-Organization-ID: <organizationId>` (except routes where the org is already in the URL, like
`/organizations/:id/members`).

### Create an organization

```http
POST /organizations
Authorization: Bearer <accessToken>
Content-Type: application/json
Idempotency-Key: 5c1e2b0a-...   (optional, recommended)

{ "name": "Acme Ltd" }
```

Creates the org, makes you its `owner`, and provisions a free-tier subscription automatically.

### List your organizations

```http
GET /organizations
Authorization: Bearer <accessToken>
```

Returns `[{ organization, role }]` — use this to populate an org switcher.

---

## Monitors

### Create a monitor

```http
POST /monitors
Authorization: Bearer <accessToken>
X-Organization-ID: <organizationId>
Content-Type: application/json

{
  "name": "Login API",
  "url": "https://api.example.com/login",
  "method": "POST",
  "expectedStatusCode": 200,
  "interval": 60,
  "timeout": 5000,
  "validationRules": [
    { "path": "$.success", "operator": "equals", "expected": true }
  ],
  "retryPolicy": { "attempts": 3, "delay": 5000 },
  "environment": "production",
  "tags": ["auth", "critical"]
}
```

Response includes an `ETag` header — save it for updates:

```
ETag: "a1b2c3d4e5..."
```

### Update a monitor (optimistic concurrency)

```http
PATCH /monitors/:id
Authorization: Bearer <accessToken>
X-Organization-ID: <organizationId>
If-Match: "a1b2c3d4e5..."
Content-Type: application/json

{ "interval": 30 }
```

A stale or missing `If-Match` returns `412 Precondition Failed` — refetch the resource (its fresh
`ETag` comes back on the `GET`) and retry.

### Run an ad-hoc test (not persisted, not scheduled)

```http
POST /monitors/:id/test
Authorization: Bearer <accessToken>
X-Organization-ID: <organizationId>
```

```json
{
  "success": true,
  "message": "Test check executed.",
  "data": {
    "statusCode": 200,
    "responseTime": 183,
    "dnsLookup": 8,
    "tcpConnect": 12,
    "tlsHandshake": 27,
    "ttfb": 74,
    "validationPassed": true,
    "failureReason": null
  }
}
```

---

## Health Checks (cursor pagination)

```http
GET /health-checks?monitorId=<id>&limit=50
Authorization: Bearer <accessToken>
X-Organization-ID: <organizationId>
```

```json
{
  "success": true,
  "data": [ /* health check documents, newest first */ ],
  "meta": { "nextCursor": "eyJpZCI6...", "hasMore": true }
}
```

Fetch the next page with `?cursor=<nextCursor>`. This collection doesn't use `page`/`limit` offset
pagination — it's the highest-volume collection in the system, so offset pagination would get
expensive fast.

---

## Incidents

```http
POST /incidents/:id/resolve
Authorization: Bearer <accessToken>
X-Organization-ID: <organizationId>
```

Manually force-closes an open incident. An AI-generated summary is queued asynchronously
(non-blocking — this response doesn't wait on it):

```http
GET /incidents/:id/summary
```

```json
{
  "success": true,
  "data": {
    "aiSummary": "The Login API failed intermittently over a 4-minute window with rising DNS resolution times, consistent with a DNS provider disruption rather than the application itself.",
    "aiRootCause": {
      "confidence": 78,
      "findings": [
        "DNS resolution rose from 12ms to 1.3s across the last 6 checks",
        "TCP connect and TLS handshake times stayed flat — the network path itself was fine once resolved",
        "Failures cluster in the us-east-1 region only; eu-west-1 checks on the same monitor stayed healthy"
      ]
    },
    "aiSuggestedFixes": [
      "Check DNS provider status for the affected region",
      "Add a secondary DNS resolver as a fallback",
      "Increase monitor timeout slightly to tolerate transient resolution delays"
    ],
    "aiAnalyzedAt": "2026-08-03T14:12:00.000Z",
    "generated": true
  }
}
```

`generated: false` means the AI worker hasn't finished yet (or `ANTHROPIC_API_KEY` isn't set, in
which case it never will — this is a non-fatal, best-effort feature). The model is prompted to
return strict JSON; if it ever returns unparseable output, `aiSummary` falls back to the raw text
and `aiRootCause`/`aiSuggestedFixes` come back empty rather than the request failing.

### Incident timeline

```http
GET /incidents/:id/timeline
```

```json
{
  "success": true,
  "data": {
    "incidentId": "...",
    "status": "closed",
    "events": [
      { "type": "healthcheck", "timestamp": "2026-08-03T14:02:00Z", "label": "Health check degraded", "detail": "Response time 3200ms in us-east-1" },
      { "type": "healthcheck", "timestamp": "2026-08-03T14:05:00Z", "label": "Health check failed", "detail": "DNS resolution timed out" },
      { "type": "incident.opened", "timestamp": "2026-08-03T14:06:00Z", "label": "Incident opened", "detail": "3 consecutive failures" },
      { "type": "notification.sent", "timestamp": "2026-08-03T14:06:05Z", "label": "Notification sent", "detail": "incident.opened \u2192 #incidents" },
      { "type": "incident.closed", "timestamp": "2026-08-03T14:12:00Z", "label": "Incident closed automatically (recovered)", "detail": "Duration: 360s" },
      { "type": "ai.analysis", "timestamp": "2026-08-03T14:12:30Z", "label": "AI analysis generated", "detail": "The Login API failed intermittently..." }
    ]
  }
}
```

Events are assembled on read from existing collections (health checks, notifications, the incident
record itself) — there's no separate event-log collection to keep in sync.

---

## Multi-region monitoring

A monitor's `region` field is an array — every region in it gets its own independent repeatable
check job and its own health-check history, not just `region[0]`. This is genuine multi-region
monitoring in the sense that you get N independent check streams; it does not (in this build)
dispatch checks from N physically distributed workers — see the backend README's known-gaps
section for what that would take.

```http
GET /monitors/:id/regions
```

```json
{
  "success": true,
  "data": [
    { "region": "us-east-1", "status": "healthy", "responseTime": 142, "statusCode": 200, "lastCheckedAt": "2026-08-03T14:20:00Z" },
    { "region": "eu-west-1", "status": "unhealthy", "responseTime": null, "statusCode": null, "lastCheckedAt": "2026-08-03T14:19:40Z" }
  ]
}
```

```http
POST /monitors/:id/test
```

Now runs against every configured region and returns an array:

```json
{
  "success": true,
  "data": [
    { "region": "us-east-1", "statusCode": 200, "responseTime": 138, "validationPassed": true },
    { "region": "eu-west-1", "statusCode": 200, "responseTime": 410, "validationPassed": true }
  ]
}
```

---

## SSL Certificates & Domains

```http
POST /ssl-certificates/:id/recheck
POST /domains/:id/recheck
```

Both queue an async recheck job (real TLS handshake / DNS lookup) and return immediately —
poll `GET /ssl-certificates/:id` afterward to see the updated status.

---

## Status Pages — the dual-purpose route

```http
# Authenticated → private, organization-scoped lookup by ID
GET /status-pages/:id
Authorization: Bearer <accessToken>
X-Organization-ID: <organizationId>

# Anonymous → public, unauthenticated view by slug — no headers needed
GET /status-pages/acme-status
```

```json
{
  "success": true,
  "data": {
    "title": "Acme API Status",
    "slug": "acme-status",
    "monitors": [
      { "name": "Login API", "status": "healthy", "environment": "production", "openIncident": null }
    ],
    "overallStatus": "operational",
    "generatedAt": "2026-08-03T12:00:00.000Z"
  }
}
```

---

## Notification Channels

```http
POST /notification-channels
Authorization: Bearer <accessToken>
X-Organization-ID: <organizationId>
Content-Type: application/json

{
  "name": "#incidents",
  "type": "slack",
  "configuration": { "webhookUrl": "https://hooks.slack.com/services/..." }
}
```

```http
POST /notification-channels/:id/test
```

Sends a real test message through the configured provider (Slack/Discord webhook, SendGrid email,
or generic webhook POST).

---

## API Keys

```http
POST /api-keys
Authorization: Bearer <accessToken>
X-Organization-ID: <organizationId>
Content-Type: application/json

{ "name": "CI Pipeline" }
```

```json
{ "success": true, "data": { "name": "CI Pipeline", "keyPrefix": "pw_live_ab12", "rawKey": "pw_live_ab12...full-key...only-shown-once" } }
```

Use the raw key as a Bearer token instead of a JWT — the backend recognizes the `pw_` prefix:

```http
GET /monitors
Authorization: Bearer pw_live_ab12...
X-Organization-ID: <organizationId>
```

(API keys are already organization-scoped, so `X-Organization-ID` is still required and is
validated to match the key's own organization.)

---

## Analytics

```http
GET /analytics/overview?from=2026-07-01&to=2026-08-01
GET /analytics/uptime?monitorId=<id>
GET /analytics/latency?monitorId=<id>
GET /analytics/incidents
```

All accept optional `from`/`to` ISO date query params (default: trailing 7 days) and an optional
`monitorId` filter on `uptime`/`latency`.

---

## Billing

```http
POST /billing/checkout
Authorization: Bearer <accessToken>
X-Organization-ID: <organizationId>
Content-Type: application/json

{ "planKey": "pro" }
```

```json
{ "success": true, "data": { "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_..." } }
```

Redirect the user to `checkoutUrl`. Requires `STRIPE_SECRET_KEY` and a `stripePriceId` set on the
target `Plan` document — otherwise returns `503`/`400` respectively.

---

## Error shape

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [{ "field": "url", "message": "Monitor URL must use HTTPS." }]
}
```

`errors` is always an array (possibly empty) of `{ field, message }` — safe to map directly onto
form fields client-side.
