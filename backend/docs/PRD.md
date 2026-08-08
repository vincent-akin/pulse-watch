# PulseWatch

## Product Requirements Document (PRD)

**Version:** 1.1 (Reconciled)

**Status:** Draft

**Author:** Vincent Akin

**Target Release:** Version 1.0 (MVP)

**Changelog from 1.0:**
- Added Functional Requirements for SSL Monitoring, Domain Expiry Monitoring, Public Status Pages, and AI Incident Summaries — these appeared in the Section 7 competitive comparison but had no corresponding requirement, and were consequently missing from every downstream engineering document.
- Added Enterprise as a named plan tier, matching the reconciled DMBR/DDD/SSD.

---

# Table of Contents

## Part I — Product

1. Executive Summary
2. Vision
3. Mission
4. Problem Statement
5. Goals & Success Metrics
6. Market Opportunity
7. Competitive Analysis
8. Product Positioning
9. User Personas
10. User Journey
11. Functional Requirements
12. Non-functional Requirements

---

## Part II — Engineering

13. System Architecture
14. Database Design
15. Backend Modules
16. API Specification
17. Authentication
18. Authorization (RBAC)
19. Multi-tenancy
20. Queue System
21. Monitoring Engine
22. Incident Engine
23. Notification Engine
24. Analytics Engine
25. AI Engine
26. Infrastructure
27. Security
28. Testing
29. Deployment
30. Roadmap

---

# 1. Executive Summary

PulseWatch is a cloud-based API Monitoring platform that continuously monitors APIs, websites, webhooks, SSL certificates, and domains.

Unlike traditional uptime monitoring services that only verify whether an endpoint responds, PulseWatch validates that the endpoint returns the **correct** response.

Example:

Traditional Monitor

```
GET /login

Status

200 OK

Result

Healthy
```

PulseWatch

```
GET /login

200 OK

Response:

{
    "success": false,
    "error":"Database Offline"
}

Result

FAILED
```

The system continuously monitors customer endpoints, detects incidents, sends notifications, stores historical data, and provides analytics for performance optimization.

---

# 2. Vision

> Build the most developer-friendly monitoring platform that tells engineers what is wrong before customers notice.

---

# 3. Mission

Provide enterprise-grade monitoring at startup-friendly pricing.

---

# 4. Problem Statement

Today's developers struggle because:

- APIs fail silently.
- Response time slowly increases.
- SSL certificates expire unexpectedly.
- Third-party providers become unavailable.
- Customers discover failures before engineers.
- Existing enterprise tools are expensive.
- Lightweight tools lack intelligent validation.

The cost of downtime includes:

- Revenue loss
- User frustration
- Brand damage
- SLA violations

PulseWatch exists to reduce Mean Time To Detection (MTTD) and Mean Time To Resolution (MTTR).

---

# 5. Success Metrics (KPIs)

## Product

- Active Organizations
- Active Monitors
- Daily Health Checks
- Incidents Detected
- Notification Delivery Rate
- User Retention
- Monthly Active Users
- API Response Validation Usage
- Status Page Views (public)

---

## Business

- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR)
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- Churn Rate
- Free-to-Paid Conversion

---

# 6. Market Opportunity

## Primary Market

- Backend developers
- SaaS founders
- Startups
- Engineering teams
- DevOps engineers
- Agencies

---

## Secondary Market

- Universities
- NGOs
- Government agencies
- Financial institutions
- Healthcare providers

---

# 7. Competitive Analysis

| Feature                  | PulseWatch  | UptimeRobot | Better Stack | Datadog  | Checkly  |
| ------------------------- | ----------- | ----------- | ------------- | -------- | -------- |
| API Monitoring           | ✅          | ✅          | ✅            | ✅       | ✅       |
| Response Validation      | ✅ Advanced | Limited     | Partial       | Advanced | Advanced |
| Public Status Pages      | ✅          | ✅          | ✅            | ❌       | ❌       |
| AI Incident Summary      | ✅          | ❌          | ❌            | Partial  | ❌       |
| SSL Monitoring           | ✅          | ✅          | ✅            | ✅       | ❌       |
| Domain Expiry Monitoring | ✅          | ❌          | ❌            | ❌       | ❌       |
| Team Collaboration       | ✅          | ✅          | ✅            | ✅       | ✅       |
| Affordable Pricing       | ✅          | ✅          | ❌            | ❌       | ❌       |

Every row marked ✅ for PulseWatch above now has a corresponding entry in Section 11 (Functional Requirements) and in the engineering documents (DMBR, DDD, SSD, API Specification).

---

# 8. Product Positioning

> "Modern API monitoring built specifically for developers."

Not another enterprise monster.

Not another basic uptime checker.

A smart monitoring platform.

---

# 9. User Personas

## Solo Developer

Age: 20–40

Needs

- Simple setup
- Affordable pricing
- Email alerts
- Fast dashboard

Pain

"I only discover problems after users complain."

---

## Startup CTO

Runs

- 25 APIs
- 15 developers

Needs

- Slack alerts
- Incident reports
- Team collaboration

---

## DevOps Engineer

Needs

- Detailed logs
- Retry history
- Latency charts
- Public status page

---

# 10. User Journey

## Registration

↓

Verify Email

↓

Create Organization

↓

Invite Team

↓

Create Monitor

↓

Monitoring Begins

↓

Incident Occurs

↓

Notification Sent

↓

Issue Resolved

↓

Recovery Notification

↓

AI Summary Generated

↓

Analytics Updated

---

# 11. Functional Requirements

## Authentication

The platform SHALL support:

- Email/password registration
- Login
- Logout
- Email verification
- Password reset
- Google OAuth
- GitHub OAuth
- MFA (TOTP) in later releases

---

## Organization Management

Each user may belong to multiple organizations.

Each organization contains:

- Members
- Monitors
- Incidents
- Billing
- API keys
- Notification channels
- Audit logs

Roles:

- Owner
- Admin
- Engineer
- Viewer

---

## Monitor Management

A monitor SHALL contain:

- Name
- Description
- Endpoint URL
- HTTP Method
- Request Headers
- Request Body
- Query Parameters
- Authentication
- Timeout
- Retry Policy
- Check Interval
- Region Selection
- Expected Status Code
- Response Validation Rules
- Tags
- Environment (Production, Staging, Development)
- Enabled/Disabled State

---

## Health Check Engine

The platform SHALL:

- Execute checks on schedule
- Measure DNS lookup time
- Measure TCP connect time
- Measure TLS handshake time
- Measure Time to First Byte (TTFB)
- Measure total response time
- Validate HTTP status
- Validate response content
- Persist all metrics
- Publish events to the incident engine

---

## SSL Monitoring

The platform SHALL:

- Automatically track the TLS certificate for every monitor using an HTTPS URL
- Check certificate validity nightly, independent of the monitor's own check interval
- Alert when a certificate enters an "expiring soon" window (< 30 days) or expires
- Surface certificate issuer, validity window, and days-until-expiry in the dashboard

---

## Domain Expiry Monitoring

The platform SHALL:

- Allow an organization to register domains for expiry tracking, independent of monitor count
- Check domain registration expiry nightly
- Alert when a domain approaches its renewal deadline

---

## Public Status Pages

The platform SHALL:

- Allow an organization to publish a public, unauthenticated status page summarizing the health of selected monitors
- Support a custom slug per organization (custom domain mapping is a future enhancement)
- Enforce plan-based limits on the number of status pages an organization may publish

---

## AI Incident Summary

The platform SHALL:

- Generate a natural-language summary of an incident once it closes, describing likely cause based on recent health check history
- Attach the summary to the incident record for display in incident reports
- Treat summary generation as non-blocking — incident closure never waits on the AI Engine

---

## Notifications

The platform SHALL notify organizations, through their configured Notification Channels, for:

- Incident opened / closed
- SSL certificate expiring / expired
- Domain expiring

---
