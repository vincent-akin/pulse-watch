# **Document 4: Database Design Document (DDD)**

**Version:** 1.1 (Reconciled)

**Purpose:** Define the production-ready MongoDB schema, relationships, indexes, validation rules, and data lifecycle.

**Changelog from 1.0:**
- Standardized all collection names to camelCase to match the SSD and codebase conventions.
- Added missing collections referenced elsewhere: `refreshTokens`, `sessions`, `plans`, `invoices`, `usageMetrics`, `sslCertificates`, `domains`, `statusPages`.
- Aligned the `monitor` schema with the API Specification (added `authentication`, kept `region` as an array).
- Aligned the `healthCheck` schema with the SSD (`startedAt` / `completedAt` instead of a single `checkedAt`).
- Clarified which collections are exempt from soft delete.

---

# Database Choice

**Primary:** MongoDB

**Reason:**

- Flexible schemas
- High write throughput (health checks)
- Easy horizontal scaling
- Suitable for time-series-like monitoring data

---

# Collections

| Collection            | Purpose                              |
| ---------------------- | ------------------------------------ |
| users                  | User accounts                        |
| organizations          | Team workspaces                      |
| organizationMembers    | User ↔ Organization relationship     |
| monitors               | APIs/websites being monitored        |
| healthChecks           | Individual check results             |
| incidents              | Downtime events                      |
| notificationChannels   | Email, Slack, Discord, etc.          |
| notifications          | Alert history                        |
| apiKeys                | API authentication                   |
| refreshTokens          | Rotating refresh tokens for sessions |
| sessions               | Active user sessions / devices       |
| sslCertificates        | Tracked TLS certificate metadata     |
| domains                | Tracked domain registrations         |
| statusPages            | Public-facing status page config     |
| plans                  | Available subscription plan defs     |
| subscriptions          | Organization ↔ Plan billing state    |
| invoices               | Billing history                      |
| usageMetrics           | Per-org usage against plan limits    |
| auditLogs              | Audit trail                          |

---

# Common Fields (All Collections)

Every document should include:

```json
{
  "_id": ObjectId,
  "createdAt": Date,
  "updatedAt": Date,
  "deletedAt": Date | null
}
```

Use **soft deletes** for business entities.

**Exception:** `healthChecks` and `auditLogs` are append-only and immutable. They do **not** carry a `deletedAt` field — records are removed only by the retention/archival job (see *Data Retention*), never by user-facing soft delete.

---

# users

```json
{
  "_id": ObjectId,
  "email": "user@example.com",
  "passwordHash": "...",
  "firstName": "John",
  "lastName": "Doe",
  "avatarUrl": null,
  "emailVerified": true,
  "mfaEnabled": false,
  "authProvider": "password",
  "oauthProviders": [
    { "provider": "google", "providerId": "..." }
  ],
  "lastLoginAt": Date
}
```

### Indexes

- `email` (unique)
- `oauthProviders.providerId`

### Notes

- `authProvider` distinguishes password vs. OAuth-originated accounts; `oauthProviders` supports linking multiple providers (Google, GitHub) to one account per the PRD's OAuth requirement.

---

# organizations

```json
{
  "_id": ObjectId,
  "name": "Acme Ltd",
  "slug": "acme",
  "ownerId": ObjectId,
  "timezone": "UTC",
  "plan": "starter"
}
```

### Indexes

- `slug` (unique)
- `ownerId`

---

# organizationMembers

```json
{
  "_id": ObjectId,
  "organizationId": ObjectId,
  "userId": ObjectId,
  "role": "admin",
  "status": "active"
}
```

### Compound Index

```text
organizationId + userId (unique)
```

---

# monitors

```json
{
  "_id": ObjectId,
  "organizationId": ObjectId,
  "name": "Login API",
  "url": "https://api.example.com/login",
  "method": "POST",
  "headers": {},
  "body": {},
  "authentication": {
    "type": "bearer",
    "credentials": {}
  },
  "interval": 60,
  "timeout": 5000,
  "enabled": true,
  "region": ["us-east-1"],
  "validationRules": [],
  "retryPolicy": {
    "attempts": 3,
    "delay": 5000
  },
  "tags": [],
  "environment": "production",
  "status": "healthy"
}
```

### Indexes

- `organizationId`
- `enabled`
- `status`
- `tags`
- `environment`
- `(organizationId, enabled)`

### Validation

- `(organizationId, url)` must be unique — enforced at the application layer per the DMBR's "URL must be unique within an organization" rule.

---

# healthChecks

**Largest collection. Immutable.**

```json
{
  "_id": ObjectId,
  "organizationId": ObjectId,
  "monitorId": ObjectId,
  "status": "healthy",
  "statusCode": 200,
  "startedAt": Date,
  "completedAt": Date,
  "responseTime": 183,
  "dnsLookup": 8,
  "tcpConnect": 12,
  "tlsHandshake": 27,
  "ttfb": 74,
  "responseSize": 1432,
  "validationPassed": true,
  "region": "us-east-1",
  "workerId": "worker-03"
}
```

### Notes

- `responseTime` is stored (not derived at query time) as `completedAt - startedAt` in milliseconds, for fast aggregation without recomputation.
- No `deletedAt` field — see *Common Fields* exception above.

### Indexes

- `(monitorId, completedAt)`
- `(organizationId, completedAt)`

---

# incidents

```json
{
  "_id": ObjectId,
  "organizationId": ObjectId,
  "monitorId": ObjectId,
  "status": "open",
  "severity": "critical",
  "startedAt": Date,
  "endedAt": null,
  "duration": null,
  "failureReason": "Timeout",
  "failureCount": 3,
  "aiSummary": null
}
```

### Notes

- `aiSummary` holds the generated natural-language incident summary (PRD Section 25, AI Engine). Null until the AI Engine populates it.

### Indexes

- `(organizationId, status)`
- `(monitorId, startedAt)`

---

# notificationChannels

```json
{
  "_id": ObjectId,
  "organizationId": ObjectId,
  "type": "slack",
  "configuration": {},
  "enabled": true
}
```

### Indexes

- `organizationId`

---

# notifications

```json
{
  "_id": ObjectId,
  "organizationId": ObjectId,
  "incidentId": ObjectId,
  "channelId": ObjectId,
  "status": "sent",
  "recipient": "team@example.com",
  "sentAt": Date
}
```

### Indexes

- `organizationId`
- `(organizationId, createdAt)`

---

# apiKeys

```json
{
  "_id": ObjectId,
  "organizationId": ObjectId,
  "name": "CI Pipeline",
  "hashedKey": "...",
  "lastUsedAt": Date,
  "expiresAt": null
}
```

**Never store raw API keys.**

### Indexes

- `organizationId`

---

# refreshTokens

Supports refresh token rotation (per API Spec security requirements).

```json
{
  "_id": ObjectId,
  "userId": ObjectId,
  "hashedToken": "...",
  "sessionId": ObjectId,
  "issuedAt": Date,
  "expiresAt": Date,
  "revokedAt": null,
  "replacedByTokenId": null
}
```

### Indexes

- `userId`
- `hashedToken` (unique)
- `expiresAt` (TTL index — auto-purge expired tokens)

### Notes

- On refresh, the old token is marked `revokedAt` and linked via `replacedByTokenId` to the new one, enabling reuse detection (if a revoked token is presented again, all tokens in that session are revoked).
- **Never store raw refresh tokens** — only hashes, consistent with `apiKeys`.

---

# sessions

```json
{
  "_id": ObjectId,
  "userId": ObjectId,
  "userAgent": "...",
  "ipAddress": "...",
  "lastActiveAt": Date,
  "revokedAt": null
}
```

### Indexes

- `userId`

---

# sslCertificates

Supports SSL Monitoring (PRD Section 7 competitive differentiator).

```json
{
  "_id": ObjectId,
  "organizationId": ObjectId,
  "monitorId": ObjectId,
  "domain": "api.example.com",
  "issuer": "Let's Encrypt",
  "validFrom": Date,
  "validTo": Date,
  "daysUntilExpiry": 45,
  "status": "valid",
  "lastCheckedAt": Date
}
```

### Indexes

- `(organizationId, validTo)`
- `monitorId`

### Validation

- `status` is derived nightly from `validTo`: `valid` / `expiring-soon` (< 30 days) / `expired`.

---

# domains

Supports Domain Expiry Monitoring (PRD Section 7 competitive differentiator).

```json
{
  "_id": ObjectId,
  "organizationId": ObjectId,
  "domainName": "example.com",
  "registrar": "Namecheap",
  "expiresAt": Date,
  "status": "active",
  "lastCheckedAt": Date
}
```

### Indexes

- `(organizationId, expiresAt)`

---

# statusPages

Supports Public Status Pages (PRD Section 7 competitive differentiator).

```json
{
  "_id": ObjectId,
  "organizationId": ObjectId,
  "slug": "acme-status",
  "title": "Acme API Status",
  "monitorIds": [ObjectId],
  "isPublic": true,
  "customDomain": null
}
```

### Indexes

- `slug` (unique)
- `organizationId`

---

# plans

```json
{
  "_id": ObjectId,
  "key": "starter",
  "name": "Starter",
  "limits": {
    "monitors": 50,
    "checkIntervalSeconds": 60,
    "teamMembers": 5,
    "dataRetentionDays": 90
  },
  "priceMonthly": 2900,
  "active": true
}
```

### Notes

- Canonical source of the plan-limit table defined in the DMBR (Free / Starter / Pro / Enterprise). `organizations.plan` and `subscriptions.plan` reference `plans.key`.

### Indexes

- `key` (unique)

---

# subscriptions

```json
{
  "_id": ObjectId,
  "organizationId": ObjectId,
  "planId": ObjectId,
  "status": "active",
  "renewalDate": Date
}
```

### Indexes

- `organizationId` (unique)

---

# invoices

```json
{
  "_id": ObjectId,
  "organizationId": ObjectId,
  "subscriptionId": ObjectId,
  "amount": 2900,
  "currency": "usd",
  "status": "paid",
  "issuedAt": Date,
  "paidAt": Date
}
```

### Indexes

- `(organizationId, issuedAt)`

---

# usageMetrics

Tracks consumption against plan limits (e.g., monitor count, check volume) so the app can enforce `DMBR` plan-limit rules without scanning `monitors`/`healthChecks` directly.

```json
{
  "_id": ObjectId,
  "organizationId": ObjectId,
  "period": "2026-07",
  "monitorsUsed": 12,
  "healthChecksRun": 481920,
  "teamMembersUsed": 4
}
```

### Indexes

- `(organizationId, period)` (unique)

---

# auditLogs

**Append-only. Immutable.**

```json
{
  "_id": ObjectId,
  "organizationId": ObjectId,
  "userId": ObjectId,
  "action": "monitor.created",
  "resource": "monitor",
  "resourceId": ObjectId,
  "ipAddress": "...",
  "userAgent": "...",
  "createdAt": Date
}
```

No `deletedAt` field — see *Common Fields* exception above.

### Indexes

- `(organizationId, createdAt)`
- `resourceId`

---

# Relationships

```text
User
 ├── OrganizationMember
 │     └── Organization
 │           ├── Monitor
 │           │     ├── HealthCheck
 │           │     ├── Incident
 │           │     └── SSLCertificate
 │           ├── Domain
 │           ├── StatusPage
 │           ├── NotificationChannel
 │           ├── Notification
 │           ├── APIKey
 │           ├── Subscription (→ Plan)
 │           ├── Invoice
 │           ├── UsageMetric
 │           └── AuditLog
 ├── RefreshToken
 └── Session
```

---

# Data Retention

| Data           | Retention                      |
| -------------- | ------------------------------- |
| Health Checks  | Plan-based (30 days–Unlimited) |
| Notifications  | 1 year                          |
| Audit Logs     | 2 years                         |
| Incidents      | Permanent                       |
| Sessions       | 90 days inactive → purged       |
| Refresh Tokens | TTL on `expiresAt`              |
| Organizations  | Soft delete                     |

---

# Validation Rules

- Email must be unique.
- Organization slug must be unique.
- Monitor URL must be a valid HTTPS URL and unique within its organization.
- Interval must respect the subscription plan (validated against `plans.limits.checkIntervalSeconds`).
- One active incident per monitor.
- One membership per user per organization.
- Refresh tokens are single-use; reuse of a revoked token revokes the entire session chain.

---

# Future Considerations (Scale)

When health checks exceed **100M+ records**:

- Archive old checks to object storage (e.g., S3).
- Consider MongoDB Time Series Collections for `healthChecks`.
- Partition by month if necessary.
- Keep analytics in pre-aggregated collections to avoid scanning raw data.

---

## Design Notes

- Multi-tenancy is enforced via `organizationId` on all tenant-owned data.
- Health checks are immutable.
- Audit logs are immutable.
- Sensitive values (passwords, API keys, tokens, refresh tokens) are stored only as hashes or encrypted values.
- Design for horizontal scaling from the start by avoiding cross-organization queries where possible.

---
