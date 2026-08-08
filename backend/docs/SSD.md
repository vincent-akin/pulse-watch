# PulseWatch

# Part II — Engineering Architecture (Production-Ready)

**Version:** 1.1 (Reconciled)

> **Objective:** Design a scalable, secure, highly available monitoring platform capable of growing from an MVP to millions of health checks per day without requiring a complete rewrite.

**Changelog from 1.0:**
- Aligned collection list, monitor document, and health check document with the DDD (single source of truth for schemas now lives in the DDD; this document references it).
- Standardized domain event names (dot-separated, no hyphens) to match the API Specification's WebSocket event table.
- Added SSL/Domain Monitoring, Status Pages, and AI Engine to module responsibilities and folder structure, closing the gap with PRD Section 7's competitive differentiators.

---

# 12. System Architecture

## Architectural Principles

PulseWatch will start as a **Modular Monolith**.

**Why not microservices initially?**

Most startups adopt microservices too early and pay the price in operational complexity.

A modular monolith provides:

- Simpler deployment
- Easier debugging
- Faster development
- Strong module boundaries
- Lower infrastructure cost

When traffic grows, modules can be extracted into separate services with minimal refactoring.

---

# High-Level Architecture

```text
                    ┌─────────────────────┐
                    │      Next.js UI     │
                    └──────────┬──────────┘
                               │ HTTPS
                               ▼
                   ┌────────────────────────┐
                   │     Express API        │
                   │  Authentication        │
                   │  Business Logic        │
                   └──────┬────────┬────────┘
                          │        │
                MongoDB   │        │ Redis
                          │        │
                          ▼        ▼
               ┌─────────────┐ ┌──────────────┐
               │   Database  │ │ BullMQ Queue │
               └─────────────┘ └──────┬───────┘
                                      │
              ┌──────────────┬────────┼────────────┬──────────────┐
              ▼              ▼        ▼            ▼              ▼
        Health Worker  Notification  Analytics  SSL/Domain     AI Worker
                          Worker       Worker      Worker
              │              │                        │             │
              ▼              ▼                        ▼             ▼
        Target APIs     Email/Slack             Registrar/CA    Incident
                                                    Lookups      Summaries
```

---

# Request Flow

## Login Request

```text
Browser
  ↓
API Gateway
  ↓
Auth Module
  ↓
JWT Generated
  ↓
MongoDB
  ↓
Response
```

---

## Health Check Flow

```text
Scheduler
  ↓
Queue Job
  ↓
Worker
  ↓
Target API
  ↓
Validate Response
  ↓
Save Log
  ↓
Update Statistics
  ↓
Incident Engine
  ↓
Notification Engine
```

---

# Folder Structure

```
pulsewatch/

apps/
    api/
    web/

packages/
    ui/
    shared/
    config/

services/
    auth/
    monitoring/
    ssl-domain/
    notification/
    analytics/
    ai/

docker/
scripts/
docs/
.github/
```

---

For the MVP, the backend can still live in a single Express application, but organize it as if each module could later become its own service.

---

# Backend Folder Structure

```
src/

config/
common/
middlewares/
utils/

modules/
    auth/
    users/
    organizations/
    monitors/
    monitoring/
    ssl-domain/
    incidents/
    notifications/
    status-pages/
    analytics/
    ai/
    billing/
    audit/

queues/
workers/
events/
emails/
validators/
cron/
types/
tests/
```

Notice there is **no generic "controllers/services/models" folder at the root**. Everything is feature-based, making the codebase easier to scale.

---

# Module Responsibilities

## Auth Module

Responsible for:

- Login / Register
- Refresh Token rotation
- Password Reset
- Email Verification
- OAuth (Google, GitHub)
- MFA (TOTP) — post-MVP, see Roadmap

---

## Users Module

Responsible for:

- User Profile
- Preferences
- API Keys
- Avatar
- Sessions

---

## Organizations Module

Responsible for:

- Organizations
- Teams
- Invitations
- Roles
- Billing Owner

---

## Monitor Module

Responsible for:

- CRUD
- Validation Rules
- Scheduling
- Tags
- Environment

---

## Monitoring Module

Responsible for:

- HTTP Requests
- DNS Timing
- SSL Validation
- Response Validation
- Retry Logic

This is the heart of the system.

---

## SSL/Domain Module

Responsible for:

- Nightly SSL certificate expiry checks per monitor domain
- Domain registration expiry checks
- Raising `sslCertificate.expiring` / `domain.expiring` events consumed by the Notification Module

---

## Incident Module

Responsible for:

- Incident Creation
- Recovery Detection
- Timelines
- Escalation
- Requesting AI-generated incident summaries from the AI Module

---

## Notification Module

Responsible for:

- Email
- Slack
- Discord
- Webhooks
- SMS (future)

---

## Status Pages Module

Responsible for:

- Public status page CRUD
- Rendering aggregated monitor status for a public, unauthenticated audience
- Custom domain mapping (future)

---

## Analytics Module

Responsible for:

- Charts
- Aggregation
- Reports
- Daily Statistics
- Monthly Statistics

---

## AI Module

Responsible for:

- Generating natural-language incident summaries (populates `incidents.aiSummary`)
- Surfacing likely root cause based on recent health check history

---

## Billing Module

Responsible for:

- Stripe
- Paystack
- Plans
- Limits
- Invoices

---

# 13. Database Design

## MongoDB Collections

Canonical schemas for every collection below (fields, indexes, validation) are defined in the **Database Design Document (DDD) v1.1** — this section lists scope only, to avoid the two documents drifting out of sync again.

```
users
organizations
organizationMembers
monitors
healthChecks
incidents
sslCertificates
domains
statusPages
notificationChannels
notifications
apiKeys
refreshTokens
sessions
plans
subscriptions
invoices
usageMetrics
auditLogs
```

---

## Relationships

```
Organization
 │
 ├── Members
 ├── Monitors
 ├── Incidents
 ├── SSL Certificates
 ├── Domains
 ├── Status Pages
 ├── Notification Channels
 └── Billing (Subscription, Invoices)

Monitor
 │
 ├── Health Checks
 ├── Incidents
 └── SSL Certificate
```

---

# Monitor Document

See DDD v1.1 §`monitors` for the authoritative schema (includes `authentication`, `region` as an array, `tags`, and `environment`).

---

# Health Check Document

See DDD v1.1 §`healthChecks` for the authoritative schema. Timing is captured via `startedAt` / `completedAt`, with `responseTime` stored as the derived duration for fast aggregation.

---

# Incident Document

See DDD v1.1 §`incidents` for the authoritative schema (includes `aiSummary`, populated by the AI Module).

---

# Indexing Strategy

Without indexes, the application will become unusable as data grows. Full index definitions live in the DDD; summary below.

### Monitors

```
organizationId
enabled
tags
environment
```

---

### Health Checks

Compound Index

```
monitorId + completedAt
organizationId + completedAt
```

This supports:

- Graphs
- Timeline
- Reports

---

### Incidents

```
organizationId + status
monitorId + startedAt
```

---

### Notifications

```
organizationId
organizationId + createdAt
```

---

# Data Retention Policy

Health checks can quickly become enormous in volume.

Instead of keeping everything forever:

| Plan       | Retention |
| ---------- | --------: |
| Free       |   30 days |
| Starter    |   90 days |
| Pro        |    1 year |
| Enterprise | Unlimited |

A nightly cleanup job should archive or delete expired records according to the customer's plan.

---

# 14. Event-Driven Architecture

Modules should communicate through domain events rather than directly calling one another.

Example:

```
Health Check Finished
  ↓
Event Published
  ↓
Incident Module
  ↓
Notification Module
  ↓
Analytics Module
```

**Naming convention:** all events are `resource.action`, dot-separated, no hyphens — matching the WebSocket event table in the API Specification.

Events to define:

- `monitor.created`
- `monitor.updated`
- `monitor.deleted`
- `healthcheck.started`
- `healthcheck.completed`
- `incident.opened`
- `incident.closed`
- `notification.sent`
- `organization.created`
- `member.invited`
- `sslcertificate.expiring`
- `domain.expiring`

This reduces coupling and makes future extraction into microservices much easier.

---

## Engineering Decisions

- **Architecture:** Modular Monolith
- **Runtime:** Node.js + Express
- **Database:** MongoDB
- **Queue:** BullMQ + Redis
- **Real-time:** WebSockets
- **Pattern:** Event-driven modules
- **Deployment:** Docker-first
- **Scalability Goal:** 10+ million health checks/day without redesign

---
