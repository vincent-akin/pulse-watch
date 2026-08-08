# **Document 5: API Specification**

**Version:** 1.2

**Purpose:** Define the REST API contract between the frontend, backend, and third-party integrations.

**Changelog from 1.1:**
- `GET /incidents/:id/summary` now returns structured AI Incident Intelligence — `aiRootCause` (confidence score + evidence findings) and `aiSuggestedFixes`, alongside the existing `aiSummary` prose — not just a paragraph.
- Added `GET /incidents/:id/timeline` — a single chronological view of the leading health-check signal, incident open, every notification attempt, acknowledgement, closure, and AI analysis for one incident.
- Added `GET /monitors/:id/regions` — the latest independently-checked status per configured region. Monitors with more than one `region` entry are now genuinely checked from each region on independent schedules (previously only `region[0]` ran).
- `POST /monitors/:id/test` now runs against every configured region and returns an array of per-region results instead of a single result.

**Changelog from 1.0:**
- Added OAuth callback endpoints (Google, GitHub) and flagged MFA endpoints as post-MVP, matching the PRD's phased rollout.
- Added `/audit-logs` endpoints (audit trail had no API surface before).
- Added SSL Certificates, Domains, and Status Pages modules to cover the PRD's competitive-differentiator features.
- Standardized WebSocket event names to dot-separated, no hyphens, matching the SSD's event-driven architecture.
- Added `X-Request-ID` header, ETag/optimistic concurrency, and cursor pagination for `health-checks` — promoted from Review Notes into the actual spec.

---

# API Standards

- **Protocol:** HTTPS only
- **Style:** REST
- **Data Format:** JSON
- **Authentication:** JWT Bearer Token
- **API Versioning:** URI (`/api/v1`)
- **Time Format:** ISO 8601 (UTC)
- **Tracing:** Every request/response includes `X-Request-ID` (client-supplied or server-generated) for cross-log correlation.

**Base URL**

```text
https://api.pulsewatch.com/api/v1
```

---

# Standard Response Format

### Success

```json
{
  "success": true,
  "message": "Monitor created successfully.",
  "data": {},
  "meta": {}
}
```

### Error

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    {
      "field": "url",
      "message": "Invalid URL."
    }
  ]
}
```

---

# Authentication

## Public Endpoints

| Method | Endpoint                       |
| ------ | ------------------------------- |
| POST   | `/auth/register`                |
| POST   | `/auth/login`                   |
| POST   | `/auth/forgot-password`         |
| POST   | `/auth/reset-password`          |
| POST   | `/auth/refresh-token`           |
| GET    | `/auth/verify-email`            |
| GET    | `/auth/oauth/google`            |
| GET    | `/auth/oauth/google/callback`   |
| GET    | `/auth/oauth/github`            |
| GET    | `/auth/oauth/github/callback`   |
| GET    | `/status-pages/:slug` _(public)_ |

---

## Protected Endpoints

All other endpoints require:

```http
Authorization: Bearer <access_token>
```

---

# Auth Module

| Method | Endpoint                       | Purpose                          |
| ------ | -------------------------------- | --------------------------------- |
| POST   | `/auth/register`                | Register                          |
| POST   | `/auth/login`                   | Login                             |
| POST   | `/auth/logout`                  | Logout (revokes current session)  |
| GET    | `/auth/me`                      | Current user                      |
| PATCH  | `/auth/profile`                 | Update profile                    |
| POST   | `/auth/change-password`         | Change password                   |
| GET    | `/auth/sessions`                | List active sessions              |
| DELETE | `/auth/sessions/:id`            | Revoke a session                  |
| POST   | `/auth/mfa/enroll`              | Begin TOTP enrollment _(post-MVP)_ |
| POST   | `/auth/mfa/verify`              | Confirm TOTP code _(post-MVP)_    |
| DELETE | `/auth/mfa`                     | Disable MFA _(post-MVP)_          |

> MFA endpoints are defined now for forward-compatibility but are not part of the MVP scope — see PRD Section 11 (MFA "in later releases").

---

# Organization Module

| Method | Endpoint             |
| ------ | --------------------- |
| GET    | `/organizations`     |
| POST   | `/organizations`     |
| GET    | `/organizations/:id` |
| PATCH  | `/organizations/:id` |
| DELETE | `/organizations/:id` |

---

# Members

| Method | Endpoint                               |
| ------ | ---------------------------------------- |
| GET    | `/organizations/:id/members`           |
| POST   | `/organizations/:id/invitations`       |
| PATCH  | `/organizations/:id/members/:memberId` |
| DELETE | `/organizations/:id/members/:memberId` |

---

# Monitors

| Method | Endpoint        |
| ------ | ---------------- |
| GET    | `/monitors`     |
| POST   | `/monitors`     |
| GET    | `/monitors/:id` |
| PATCH  | `/monitors/:id` |
| DELETE | `/monitors/:id` |

Additional actions:

| Method | Endpoint                      |
| ------ | ------------------------------ |
| POST   | `/monitors/:id/pause`         |
| POST   | `/monitors/:id/resume`        |
| POST   | `/monitors/:id/test`          |
| GET    | `/monitors/:id/health-checks` |
| GET    | `/monitors/:id/incidents`     |
| GET    | `/monitors/:id/regions` _(latest status per configured region)_ |

`PATCH /monitors/:id` requires an `If-Match` header carrying the resource's current `ETag` (see *Optimistic Concurrency*).

---

# Health Checks

| Method | Endpoint             |
| ------ | --------------------- |
| GET    | `/health-checks`     |
| GET    | `/health-checks/:id` |

Supports filtering by:

- Monitor
- Date range
- Status
- Response time
- Region

`GET /health-checks` uses **cursor-based pagination** (see *Query Parameters*) rather than page/limit, since this is the highest-volume collection.

---

# Incidents

| Method | Endpoint                                     |
| ------ | ---------------------------------------------- |
| GET    | `/incidents`                                 |
| GET    | `/incidents/:id`                             |
| POST   | `/incidents/:id/acknowledge`                 |
| POST   | `/incidents/:id/resolve` _(manual override)_ |
| GET    | `/incidents/:id/summary` _(AI-generated)_    |
| GET    | `/incidents/:id/timeline` _(unified chronological event view)_ |

---

# SSL Certificates

| Method | Endpoint                    |
| ------ | ---------------------------- |
| GET    | `/ssl-certificates`         |
| GET    | `/ssl-certificates/:id`     |
| POST   | `/ssl-certificates/:id/recheck` |

---

# Domains

| Method | Endpoint                |
| ------ | ------------------------- |
| GET    | `/domains`              |
| POST   | `/domains`              |
| GET    | `/domains/:id`          |
| DELETE | `/domains/:id`          |
| POST   | `/domains/:id/recheck`  |

---

# Status Pages

| Method | Endpoint                    |
| ------ | ----------------------------- |
| GET    | `/status-pages`              |
| POST   | `/status-pages`              |
| GET    | `/status-pages/:id`          |
| PATCH  | `/status-pages/:id`          |
| DELETE | `/status-pages/:id`          |
| GET    | `/status-pages/:slug` _(public, unauthenticated)_ |

---

# Notification Channels

| Method | Endpoint                          |
| ------ | ----------------------------------- |
| GET    | `/notification-channels`          |
| POST   | `/notification-channels`          |
| PATCH  | `/notification-channels/:id`      |
| DELETE | `/notification-channels/:id`      |
| POST   | `/notification-channels/:id/test` |

---

# Notifications

| Method | Endpoint             |
| ------ | --------------------- |
| GET    | `/notifications`     |
| GET    | `/notifications/:id` |

---

# API Keys

| Method | Endpoint               |
| ------ | ----------------------- |
| GET    | `/api-keys`            |
| POST   | `/api-keys`            |
| DELETE | `/api-keys/:id`        |
| POST   | `/api-keys/:id/rotate` |

---

# Audit Logs

| Method | Endpoint          |
| ------ | ------------------ |
| GET    | `/audit-logs`     |
| GET    | `/audit-logs/:id` |

Supports filtering by:

- User
- Action
- Resource type
- Date range

Read-only — audit logs cannot be created, modified, or deleted via the API.

---

# Analytics

| Method | Endpoint               |
| ------ | ----------------------- |
| GET    | `/analytics/overview`  |
| GET    | `/analytics/uptime`    |
| GET    | `/analytics/latency`   |
| GET    | `/analytics/incidents` |

---

# Billing (Future)

| Method | Endpoint                |
| ------ | ------------------------ |
| GET    | `/billing/plans`        |
| GET    | `/billing/subscription` |
| POST   | `/billing/checkout`     |
| POST   | `/billing/webhook`      |
| GET    | `/billing/invoices`     |

---

# Query Parameters

### Pagination (offset-based — most resources)

```http
GET /monitors?page=1&limit=20
```

Response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 153,
    "totalPages": 8
  }
}
```

---

### Pagination (cursor-based — `health-checks` only)

```http
GET /health-checks?monitorId=...&cursor=eyJpZCI6...&limit=100
```

Response:

```json
{
  "data": [],
  "meta": {
    "nextCursor": "eyJpZCI6...",
    "hasMore": true
  }
}
```

---

### Sorting

```http
GET /monitors?sort=createdAt:desc
```

Supported directions:

- asc
- desc

---

### Searching

```http
GET /monitors?search=payment
```

---

### Filtering

```http
GET /monitors?status=healthy&enabled=true
```

---

# HTTP Status Codes

| Code | Meaning                |
| ---- | ----------------------- |
| 200  | Success                |
| 201  | Created                |
| 204  | No Content             |
| 400  | Bad Request            |
| 401  | Unauthorized           |
| 403  | Forbidden              |
| 404  | Not Found              |
| 409  | Conflict               |
| 412  | Precondition Failed _(stale ETag on update)_ |
| 422  | Validation Error       |
| 429  | Too Many Requests      |
| 500  | Internal Server Error  |

---

# Rate Limiting

| Endpoint       |        Limit |
| -------------- | ------------: |
| Login          |     5/min/IP |
| Register       |    3/hour/IP |
| Password Reset | 5/hour/email |
| General API    | 120/min/user |
| API Keys       |  600/min/key |

---

# API Versioning

- Current: `/api/v1`
- Breaking changes require `/api/v2`
- Non-breaking changes remain in the same version.

---

# Idempotency

Required for operations that may be retried safely:

- Create Monitor
- Create Organization
- Invite Member

Clients send:

```http
Idempotency-Key: <UUID>
```

The server stores the result for a configurable period (e.g., 24 hours) to prevent duplicate processing.

---

# Optimistic Concurrency

Mutable resources (`monitors`, `notificationChannels`, `statusPages`, `organizations`) return an `ETag` header on `GET`. Updates must echo it back:

```http
PATCH /monitors/:id
If-Match: "a1b2c3"
```

A mismatched or missing `If-Match` on a resource that has since changed returns `412 Precondition Failed`, preventing accidental overwrites when multiple users edit the same resource concurrently.

---

# WebSocket Events

Event names are dot-separated with no hyphens, matching the SSD's event-driven architecture.

| Event                   | Payload           |
| ------------------------ | ----------------- |
| `monitor.updated`        | Monitor summary  |
| `healthcheck.completed`  | Latest result    |
| `incident.opened`        | Incident details |
| `incident.closed`        | Recovery details |
| `notification.sent`      | Delivery status  |
| `sslcertificate.expiring`| Certificate summary |
| `domain.expiring`        | Domain summary   |

These power real-time dashboard updates.

---

# Security Requirements

- JWT access tokens (short-lived)
- Refresh token rotation, with reuse detection (see DDD `refreshTokens`)
- RBAC on every protected endpoint
- Input validation
- Request size limits
- CORS allowlist
- Security headers (Helmet)
- HTTPS enforced

---

# API Design Principles

- Resource-oriented URLs
- Consistent naming
- Standard response envelope
- Predictable pagination (offset for most resources, cursor for `health-checks`)
- Clear error messages
- Backward-compatible evolution
- No business logic in controllers

---

# Implementation Notes (v1.1 → actual build)

Two small, deliberate deviations from this spec exist in the shipped backend, both documented here
so this spec stays the source of truth:

1. **MFA endpoints return `501 Not Implemented`.** They're routed and reachable (matching the table
   above) but return a clear "not yet available" error, since MFA is explicitly post-MVP per the PRD.
2. **`GET /status-pages/:slug`** is genuinely dual-purpose at the same path, as this spec implies by
   listing it both as a public endpoint and under the Status Pages module: an anonymous caller gets
   the public, unauthenticated view by slug; an authenticated caller (with `Authorization` +
   `X-Organization-ID`) gets the private, organization-scoped lookup. See `API_REFERENCE.md` for
   worked examples of both.

See `API_REFERENCE.md` for request/response examples against the actual implementation, and the
`postman/` collection for a ready-to-run client.
