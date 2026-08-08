# **Document 3: Domain Model & Business Rules (DMBR)**

**Status:** Version 1.1 (Reconciled)

## Purpose

Defines the core business entities, their relationships, ownership, lifecycle, and rules before designing the database.

**Changelog from 1.0:**
- Added SSLCertificate, Domain, and StatusPage entities to cover the PRD's competitive-differentiator features (previously undefined at the domain level despite appearing in the PRD).
- Added Enterprise to the Plan Limits table (was present in the SSD's retention table but missing here).
- Added Session/RefreshToken as domain concepts, since Auth security rules (refresh rotation, revocation) are business rules, not just implementation detail.

---

# Core Domain Entities

| Entity               | Purpose                                  |
| --------------------- | ------------------------------------------ |
| User                  | Person using the platform                 |
| Session               | An authenticated device/browser instance   |
| Organization          | Workspace for a company/team               |
| OrganizationMember    | Links users to organizations with roles    |
| Monitor               | API/Website being monitored                |
| HealthCheck           | Result of a monitor execution              |
| Incident              | Downtime or validation failure             |
| SSLCertificate        | Tracked TLS certificate for a monitor      |
| Domain                | Tracked domain registration                |
| StatusPage            | Public-facing uptime summary               |
| NotificationChannel   | Email, Slack, Discord, etc.                |
| Notification          | Alert sent to users                        |
| APIKey                | Programmatic access                        |
| Plan                  | Named tier defining feature limits         |
| Subscription          | Billing & plan assignment                  |
| AuditLog              | Tracks important actions                   |

---

# Relationships

```text
User
 ├── Session
 └── OrganizationMember
      └── Organization
           ├── Monitors
           │     ├── HealthChecks
           │     ├── Incidents
           │     └── SSLCertificate
           ├── Domains
           ├── StatusPages
           ├── Incidents
           ├── Notification Channels
           └── Subscription (→ Plan)
```

---

# Ownership Rules

- A **User** can belong to many Organizations.
- A **User** can have many active Sessions (devices).
- An **Organization** owns all its data.
- A **Monitor** belongs to exactly one Organization.
- A **HealthCheck** belongs to one Monitor.
- An **Incident** belongs to one Monitor.
- An **SSLCertificate** belongs to one Monitor.
- A **Domain** belongs to one Organization (not necessarily tied to a single monitor).
- A **StatusPage** belongs to one Organization and references one or more Monitors.
- Deleting an Organization soft-deletes all child data.

---

# Monitor Lifecycle

```text
Draft
 ↓
Active
 ↓
Paused
 ↓
Active
 ↓
Archived
```

Rules:

- Only **Active** monitors are checked.
- Archived monitors cannot be restored (except by support).

---

# Incident Lifecycle

```text
Healthy
 ↓
Failure Detected
 ↓
Retries
 ↓
Incident Open
 ↓
Recovery Detected
 ↓
Incident Closed
```

Rules:

- Configurable retry count before opening an incident.
- Recovery closes the incident automatically.
- Once closed, an incident may optionally receive an AI-generated summary (does not block closure).

---

# SSL Certificate & Domain Lifecycle

```text
Valid
 ↓
Expiring Soon (< 30 days)
 ↓
Expired
```

Rules:

- Checked nightly, independent of the monitor's regular health-check interval.
- Entering "Expiring Soon" or "Expired" raises a notification through the same Notification Channels as an incident.
- Does not itself open an Incident — it is a distinct alert category.

---

# User Roles (RBAC)

| Role     | Permissions                                |
| --------- | -------------------------------------------- |
| Owner     | Full access, billing, delete organization    |
| Admin     | Manage monitors, members, settings           |
| Engineer  | Manage monitors, view incidents              |
| Viewer    | Read-only access                             |

Status pages are visible to the public regardless of role — RBAC governs who can *edit* a status page's configuration, not who can view its published output.

---

# Business Rules

### Monitors

- URL must be unique within an organization.
- Check interval cannot be below the plan limit.
- Disabled monitors are never scheduled.

### Health Checks

- Immutable after creation.
- Never edited or deleted individually.

### Incidents

- One active incident per monitor.
- Auto-close on successful recovery.

### SSL Certificates & Domains

- Only monitors using HTTPS URLs generate an associated SSLCertificate record.
- Domain tracking is opt-in per organization and independent of monitor count.

### Notifications

- Failed deliveries are retried.
- Delivery history is retained.

### Sessions & Authentication

- A refresh token is single-use; presenting an already-used (revoked) token revokes the entire session.
- Logging out revokes the session and its associated refresh token.
- OAuth sign-in (Google, GitHub) creates or links a User record by verified email.

---

# Plan Limits (Example)

| Feature         |     Free | Starter |       Pro | Enterprise |
| ---------------- | -------: | ------: | --------: | ---------: |
| Monitors        |        5 |      50 |       500 |  Unlimited |
| Check Interval  |    5 min |   1 min |    30 sec |     10 sec |
| Team Members    |        1 |       5 | Unlimited |  Unlimited |
| Data Retention  |  30 days | 90 days |    1 year |  Unlimited |
| SSL/Domain Monitoring | ❌ | ✅ | ✅ | ✅ |
| Status Pages    |        0 |       1 |         5 |  Unlimited |

---

# Global Business Principles

- All data is isolated by **Organization** (multi-tenancy).
- All destructive actions use **soft delete** unless legally required.
- Every important action generates an **Audit Log**.
- Every API request is authenticated except public endpoints (including public status pages).
- Every feature enforces subscription limits.

---

## Deliverables from this Document

This defines the business foundation for:

- Database schema
- API design
- Authorization
- Queue processing
- Analytics
- Billing
- SSL/Domain monitoring
- Public status pages
