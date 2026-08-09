# PulseWatch Web

The full PulseWatch dashboard — a Next.js 16 (App Router) frontend covering every module of the
PulseWatch API: auth, monitors, incidents, SSL/domain monitoring, status pages, notifications,
organizations & members, API keys, audit logs, analytics, and billing.

Pairs with the `pulsewatch-backend` project. This app is a pure API client — all business logic,
validation, and persistence lives in the backend.

---

## Demo accounts

Run `npm run seed:demo` on the backend once, then log in here with any of:

| Role              | Email                       | Password         |
| ----------------- | ---------------------------- | ----------------- |
| Admin (owner)     | `admin@pulsewatch.demo`      | `AdminPass123!`   |
| User (engineer)   | `engineer@pulsewatch.demo`   | `UserPass123!`    |
| User (viewer)     | `viewer@pulsewatch.demo`     | `UserPass123!`    |

The seed also creates a **Demo Organization** with three sample monitors and a public status page
at `/status/demo-status`, so the dashboard isn't empty on first login. Log in as `viewer` to see
the UI adapt (mutating actions hidden/disabled) to a read-only role.

---

## Stack

- **Next.js 16** (App Router, Turbopack), plain JavaScript (no TypeScript, matching the backend)
- **Tailwind CSS v4** with a custom brand design system — Vibrant Yellow `#fedd00` accent on Deep
  Bold Purple `#0d000a`, Neutral White `#f3f2f2` foreground (CSS-variable tokens in `app/globals.css`)
- **Recharts** for uptime/latency/incident charts
- **Socket.IO client** for real-time monitor/incident/notification events — one shared connection
  per organization via `lib/SocketContext.js`, not one per page
- **react-hot-toast** for feedback, **lucide-react** for icons

No server-side data fetching, no server actions — everything talks to the backend REST API via
`lib/apiClient.js`, a fetch wrapper that:
- attaches `Authorization: Bearer <token>` and `X-Organization-ID` automatically
- retries once on `401` by rotating the refresh token (shared in-flight promise, so concurrent
  requests don't race the same refresh token)
- reads/sends `ETag` / `If-Match` for optimistic concurrency on monitors, organizations,
  notification channels, and status pages
- unwraps the backend's `{ success, message, data, meta }` envelope into `{ data, meta, etag }`

---

## Running it

```bash
npm install
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_BASE_URL at your running backend
npm run dev                         # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

Both `npm run build` and `npx eslint .` are clean — verified in this environment (31/31 routes
compiled and statically generated where possible; 3 pages using `useSearchParams` — reset-password,
verify-email, oauth/success — are wrapped in `<Suspense>` as Next.js requires).

---

## Structure

```
app/
  (auth)/            login, register, forgot/reset password, verify email — shared minimal layout
  oauth/              success/failure OAuth redirect handlers
  (dashboard)/        every authenticated module, wrapped in DashboardShell (sidebar + topbar + auth guard)
    dashboard/         overview: stat cards, uptime/latency charts, open incidents
    monitors/           list, create, detail (health checks, region status grid, incidents,
                        test-all-regions/pause/resume/edit/delete)
    incidents/           list, detail (acknowledge/resolve, AI root cause + suggested fixes, timeline)
    ssl-certificates/    list + recheck
    domains/             list, create, recheck, delete
    status-pages/        authenticated CRUD (monitor picker)
    notifications/       channel CRUD (email/Slack/Discord/webhook) + delivery history
    organizations/       list/switch/create
    members/             invite, role change, remove
    api-keys/            create (shown once), rotate, delete
    audit-logs/          read-only, filterable
    analytics/           overview/uptime/latency/incident aggregates
    billing/             plan cards, Stripe checkout redirect, invoices
    settings/             org settings + danger zone, profile, sessions
  status/[slug]/       PUBLIC, unauthenticated status page — fetched without the auth client

lib/
  apiClient.js         fetch wrapper, refresh-token rotation, ETag handling
  tokenStorage.js       localStorage helpers (access/refresh token, current org id)
  AuthContext.js         current user, login/register/logout
  OrgContext.js           memberships, current org, role, switching
  SocketContext.js        one shared Socket.IO connection per organization
  useResource.js          generic fetch-on-mount(+deps) hook
  useSocket.js             subscribes to real-time events on the shared connection
  format.js                dates, durations, bytes, status→color map

components/
  ui/                 Button, Input, Select, Textarea, Card, Badge, Table, Modal, Pagination,
                       EmptyState, Spinner, StatCard, PulseLogo (signature ECG-trace mark)
  layout/              Sidebar, Topbar, OrgSwitcher, DashboardShell, navConfig
  charts/               UptimeChart, LatencyChart (Recharts)
  monitors/             MonitorForm (shared create/edit), RegionStatusGrid (multi-region status)
  incidents/             IncidentTimeline (unified chronological event view)
  status-pages/         StatusPageForm (shared create/edit, monitor picker)
  notifications/        ChannelForm (shared create; type-specific configuration fields)
```

## Design system

Brand palette from the client's colour spec — Vibrant Yellow `#fedd00` (accent), Deep Bold Purple
`#0d000a` (background), Neutral White `#f3f2f2` (foreground) — applied as CSS-variable tokens in
`app/globals.css`, so every component (buttons, badges, charts, focus rings) derives from the same
three values rather than hardcoding colors per-component.

Two pulse animations, used deliberately rather than as wallpaper:
- **`PulseLogo`** (`components/ui/PulseLogo.js`) — the small animated heartbeat-trace mark, in the
  sidebar brand and auth screen header.
- **`PulseBanner`** — a wider sweeping EKG-monitor-style trace (continuous `stroke-dashoffset`
  animation), shown once per screen as a moment rather than a loop you stop noticing: under the
  login/register header, and at the top of the public status page.
- **`LiveDot`** — a small pulsing dot (ping + scale animation) wired to the *actual* Socket.IO
  connection state in the Topbar ("Live"/"Offline"), not just decorative.

Dense data tables, monospace for all numbers/timestamps/IDs — closer to Vercel/Linear/Better Stack
than a marketing site.

Fonts are declared as **Space Grotesk / Inter / JetBrains Mono** in `app/globals.css` but fall back
to system fonts, since this environment couldn't reach `fonts.googleapis.com` to self-host them at
build time. To get the exact intended typefaces, swap the `--font-*` variables back to
`next/font/google` (a two-line change in `app/layout.js` + `globals.css` — was already working
before it was reverted for this constraint) once you have network access, or self-host the font
files under `next/font/local`.

## Auth model

Tokens live in `localStorage` (not httpOnly cookies) for simplicity — this is a pure SPA-style
client talking to a separately-hosted API, and route protection happens client-side in
`DashboardShell` rather than via Next.js middleware (which can't read `localStorage`). If you need
defense-in-depth against XSS token theft, the straightforward upgrade path is moving the backend to
set httpOnly cookies and switching this app to `credentials: "include"` fetches instead.

## Known gaps

- **MFA** — no UI, since the backend intentionally returns `501` for it (post-MVP per the PRD).
- **Custom status-page domains** — modeled on the backend, not exposed in the UI (PRD marks it a
  future enhancement).
- **OAuth buttons** just link to the backend's `/auth/oauth/google` and `/auth/oauth/github`
  redirect endpoints — they'll 404/error until you configure real OAuth credentials on the backend.
- Validation-rule / header / body editing on the monitor form uses raw JSON textareas rather than
  a fully dynamic key-value / rule-builder UI — functional, but a rougher edge than the rest of the
  form. Worth revisiting if monitor configuration becomes a frequent task for less technical users.
