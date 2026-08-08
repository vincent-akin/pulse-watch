# PulseWatch API

Production-grade backend for PulseWatch — an API/website/SSL/domain monitoring platform with
response validation, incident detection, real-time notifications, public status pages, analytics,
and AI-generated incident summaries.

Built directly from the reconciled v1.1 spec set, included verbatim in [`docs/`](./docs): **PRD**,
**DMBR** (domain model & business rules), **DDD** (MongoDB schema), **SSD** (system architecture),
and the **API Specification** — plus a practical [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md)
with worked request/response examples, and a ready-to-run [`postman/`](./postman) collection.

Pairs with the `pulsewatch-web` project (Next.js frontend) — this repo is API-only.

---

## Quick start (demo in under 5 minutes)

```bash
cp .env.example .env
docker compose up --build -d
docker compose exec api npm run seed:plans   # Free/Starter/Pro/Enterprise plan definitions
docker compose exec api npm run seed:demo    # 1 admin + 2 users, a demo org, sample monitors
```

Then log in (via the frontend, or directly against the API — see below) with:

| Role              | Email                     | Password        |
| ----------------- | ------------------------- | --------------- |
| Admin (owner)     | `admin@pulsewatch.demo`    | `AdminPass123!` |
| User (engineer)   | `engineer@pulsewatch.demo` | `UserPass123!`  |
| User (viewer)     | `viewer@pulsewatch.demo`   | `UserPass123!`  |

The demo seed also creates a **Demo Organization** on the Pro plan, three sample monitors
(`api.github.com`, and two `httpbin.org` endpoints), a Slack-free email notification channel, and a
public status page at `/status-pages/demo-status` (or `http://localhost:3000/status/demo-status`
from the frontend). **Change or remove these accounts before deploying anywhere but your own
machine** — `seed:demo` is meant for local evaluation, not production seed data.

---

## Architecture

Modular monolith (per SSD §12): one Express app + a set of standalone worker/cron processes that
share the same codebase and could be extracted into separate services later with no rewrite.

```
docs/             PRD, DMBR, DDD, SSD, API_Specification (canonical specs) + API_REFERENCE (examples)
postman/          Postman collection + environment, generated from generate_postman.py

src/
  config/         env, logger, MongoDB, Redis
  common/         AppError, response envelope, pagination, sorting, constants
  middlewares/    JWT/API-key auth, RBAC, rate limiting, ETag/optimistic concurrency,
                  idempotency keys, validation, error handling
  models/         19 Mongoose schemas — 1:1 with the DDD
  modules/        auth, organizations, monitors, monitoring, incidents, ssl-domain,
                  notifications, status-pages, apiKeys, audit, analytics, billing
  integrations/   Stripe, SendGrid, Slack/Discord/webhooks, Google/GitHub OAuth, Anthropic AI
  events/         internal domain event bus + Socket.IO bridge
  queues/         BullMQ queue registry
  workers/        health-check, notification, ssl-domain, ai-summary, analytics workers
  cron/           nightly SSL/domain checks, retention cleanup
  scripts/        plan seeding, demo account/data seeding
  tests/          Jest unit tests (incl. a live HTTP health-check test)
  app.js          Express app assembly
  server.js       HTTP + WebSocket entrypoint
```

## What's real vs. what needs your credentials

Every integration is wired to the **real** provider SDK/API — nothing is faked at the code level:

| Integration | Library | Behavior with no credentials |
|---|---|---|
| Stripe (billing, checkout, webhooks) | `stripe` | Billing routes return `503` until `STRIPE_SECRET_KEY` is set |
| SendGrid (email) | `@sendgrid/mail` | Emails log a dry-run warning instead of sending |
| Slack / Discord | raw webhook POST via `axios` | Fails per-channel; delivery is retried and marked `failed` in `notifications` |
| Google / GitHub OAuth | manual OAuth2 code exchange via `axios` | `/auth/oauth/*` will fail until client ID/secret are set |
| Anthropic (AI incident summaries) | REST `/v1/messages` via `axios` | Skips summary generation (non-blocking, per PRD §11) |

Fill in `.env` (see `.env.example`) with real keys to activate each one.

---

## Running it

### Option A — Docker Compose (recommended)

```bash
cp .env.example .env   # fill in whatever credentials you have; safe to leave blanks for now
docker compose up --build -d
docker compose exec api npm run seed:plans
docker compose exec api npm run seed:demo    # optional — demo accounts + sample data
```

This starts MongoDB, Redis, the API (`:4000`), the combined worker process, and the cron scheduler.

### Option B — Local Node

Requires a running MongoDB and Redis reachable at the URIs in `.env`.

```bash
npm install
cp .env.example .env
npm run seed:plans
npm run seed:demo      # optional — demo accounts + sample data
npm run dev            # API on :4000
npm run worker:all      # in a second terminal — all queue workers in one process
npm run cron            # in a third terminal — nightly SSL/domain + retention jobs
```

Workers can also be run individually: `npm run worker:health`, `worker:notification`,
`worker:sslDomain`, `worker:ai`, `worker:analytics`.

### Tests & syntax check

```bash
npm test                    # Jest — unit tests, including a live HTTP health-check test
npm run lint:syntax         # node --check across every src/ file (fast, no DB/Redis needed)
```

---

## API surface

Base URL: `/api/v1` (see [`docs/API_Specification.md`](./docs/API_Specification.md) for the full
contract, [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md) for worked examples, and
[`postman/`](./postman) for a ready-to-run client). Highlights:

- **Auth**: register/login/logout, email verify, password reset, refresh-token rotation with
  reuse detection, Google/GitHub OAuth, sessions, MFA endpoints stubbed for post-MVP (`501`).
- **Organizations**: CRUD, members/invitations, RBAC (owner > admin > engineer > viewer).
- **Monitors**: CRUD with plan-quota + interval + unique-URL enforcement, pause/resume/test,
  nested health-checks/incidents, **multi-region checks** — every entry in a monitor's `region`
  array gets its own independent repeatable job and its own health-check history (`GET
  /monitors/:id/regions` for the latest per-region status).
- **Health Checks**: cursor-paginated (`GET /health-checks`), real DNS/TCP/TLS/TTFB timing captured
  via raw Node `http`/`https` socket events — not simulated.
- **Incidents**: retry-threshold opening, auto-close on recovery, manual acknowledge/resolve,
  **AI Incident Intelligence** (non-blocking) — a plain-language summary plus a structured root
  cause hypothesis (confidence score + evidence findings) and concrete suggested fixes, and a
  **unified timeline** (`GET /incidents/:id/timeline`) assembling the leading health-check signal,
  open/acknowledge/close events, every notification attempt, and the AI analysis into one
  chronological view.
- **SSL Certificates / Domains**: real TLS handshake cert fetch (`tls.connect`), nightly recheck
  jobs, plan-gated.
- **Status Pages**: authenticated CRUD + a public unauthenticated view at the same path shape the
  API Spec defines (`GET /status-pages/:slug`).
- **Notifications**: channel CRUD (email/Slack/Discord/webhook) with real delivery + retry +
  delivery history.
- **API Keys**: bcrypt-hashed, shown once, rotate/revoke.
- **Audit Logs**: read-only, immutable.
- **Analytics**: overview/uptime/latency/incidents via MongoDB aggregation pipelines.
- **Billing**: real Stripe Checkout session creation + webhook-driven subscription/invoice sync.

Every mutating request on `monitors`, `notificationChannels`, `statusPages`, and `organizations`
enforces `If-Match`/`ETag` optimistic concurrency (`412` on stale writes). `Idempotency-Key` is
honored on monitor/organization creation and member invitations. Rate limits match the API Spec's
table exactly (login 5/min/IP, register 3/hour/IP, password reset 5/hour/email, general API
120/min/user, API keys 600/min/key).

---

## RBAC quick reference

| Role      | Can do |
| --------- | ------ |
| `owner`   | Everything, including billing and deleting the organization |
| `admin`   | Manage monitors, members, notification channels, status pages, domains, API keys |
| `engineer`| Manage monitors, acknowledge/resolve incidents, test channels |
| `viewer`  | Read-only across the organization |

The seeded demo accounts cover three of these (`owner`, `engineer`, `viewer`) so you can exercise
the permission boundaries directly — e.g. log in as `viewer@pulsewatch.demo` and confirm mutating
requests return `403`.

---

## Known gaps / next steps

- **Multi-region monitoring runs N independent check schedules, not N physically distributed
  workers.** Each region on a monitor gets its own repeatable job and its own health-check
  history — genuinely useful for comparing "is this failing everywhere or just from one config",
  and the data model is ready for real geo-distribution — but every job still executes wherever
  the worker process runs. Real multi-region would mean deploying the health-check worker to
  multiple regions (or routing through a service like a global proxy/edge function per region) and
  having each instance only pick up jobs tagged for its own region.
- **AI Incident Intelligence quality depends entirely on the model and the available health-check
  history.** With very little failure history (e.g. an incident on a brand-new monitor), expect
  low-confidence, hedged output — the prompt explicitly asks the model to say so rather than
  fabricate specifics, but a thin incident is still a thin incident.
- **MFA (TOTP)** — routes exist and return `501`; PRD explicitly scopes this to a later release.
- **Domain WHOIS lookups** — `recheckDomain` confirms DNS resolution but expects a WHOIS provider
  function to be injected for real expiry dates (no free, reliable WHOIS API is wired by default —
  pick a provider and pass its lookup function into the SSL/Domain worker).
- **OAuth state store** — uses an in-memory `Map` for the CSRF `state` param; swap for Redis before
  running more than one API instance.
- **Custom domains for status pages** — modeled in the schema, not yet implemented (PRD marks this
  "future enhancement").
- **Demo credentials are not production credentials.** `npm run seed:demo` is idempotent and safe
  to re-run, but it writes real (if well-known) password hashes to whatever database it's pointed
  at — don't run it against a production database, or rotate/delete those accounts immediately if
  you do.
- This was built and verified in a sandboxed environment without a reachable MongoDB server, so
  every file passes `node --check`, the full Express app boots and wires all routes/middleware
  against a live Redis instance, and the Jest suite (including a real HTTP health-check test)
  passes — but it has not yet been run end-to-end against a live Mongo instance. Recommend running
  `docker compose up` and walking through register → create org → create monitor → watch a health
  check land, as a first smoke test (or use the seeded demo account to skip straight to that).
