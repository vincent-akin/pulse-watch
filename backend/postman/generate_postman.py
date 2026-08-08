"""
Generates postman/PulseWatch.postman_collection.json from a compact endpoint list.
Run with: python3 generate_postman.py
Not part of the app runtime — a one-off authoring tool kept for future edits.
"""
import json
import uuid

BASE = "{{baseUrl}}"

def item(name, method, path, body=None, headers=None, auth=True, org=False, test_script=None, description=""):
    hdrs = []
    if body is not None:
        hdrs.append({"key": "Content-Type", "value": "application/json"})
    if org:
        hdrs.append({"key": "X-Organization-ID", "value": "{{organizationId}}"})
    for h in (headers or []):
        hdrs.append(h)

    req = {
        "method": method,
        "header": hdrs,
        "url": {
            "raw": f"{BASE}/api/v1{path}",
            "host": [BASE],
            "path": ["api", "v1"] + [p for p in path.lstrip("/").split("/") if p],
        },
        "description": description,
    }
    if body is not None:
        req["body"] = {"mode": "raw", "raw": json.dumps(body, indent=2)}
    if auth:
        req["auth"] = {"type": "bearer", "bearer": [{"key": "token", "value": "{{accessToken}}", "type": "string"}]}
    else:
        req["auth"] = {"type": "noauth"}

    entry = {"name": name, "request": req, "response": []}
    if test_script:
        entry["event"] = [{
            "listen": "test",
            "script": {"type": "text/javascript", "exec": test_script.strip("\n").split("\n")},
        }]
    return entry

def folder(name, items, description=""):
    return {"name": name, "item": items, "description": description}


# ── Auth ─────────────────────────────────────────────────────────────────
auth_items = [
    item("Register", "POST", "/auth/register", auth=False, body={
        "email": "jane@example.com", "password": "SuperSecret123!", "firstName": "Jane", "lastName": "Doe"
    }),
    item("Verify Email", "GET", "/auth/verify-email?token={{emailVerificationToken}}", auth=False),
    item("Login", "POST", "/auth/login", auth=False, body={
        "email": "admin@pulsewatch.demo", "password": "AdminPass123!"
    }, test_script="""
if (pm.response.code === 200) {
    const data = pm.response.json().data;
    pm.collectionVariables.set("accessToken", data.accessToken);
    pm.collectionVariables.set("refreshToken", data.refreshToken);
    pm.collectionVariables.set("userId", data.user.id);
}
"""),
    item("Refresh Token", "POST", "/auth/refresh-token", auth=False, body={"refreshToken": "{{refreshToken}}"}, test_script="""
if (pm.response.code === 200) {
    const data = pm.response.json().data;
    pm.collectionVariables.set("accessToken", data.accessToken);
    pm.collectionVariables.set("refreshToken", data.refreshToken);
}
"""),
    item("Forgot Password", "POST", "/auth/forgot-password", auth=False, body={"email": "jane@example.com"}),
    item("Reset Password", "POST", "/auth/reset-password", auth=False, body={"token": "{{resetToken}}", "password": "NewSecret123!"}),
    item("Current User (me)", "GET", "/auth/me"),
    item("Update Profile", "PATCH", "/auth/profile", body={"firstName": "Jane", "lastName": "Doe"}),
    item("Change Password", "POST", "/auth/change-password", body={"currentPassword": "AdminPass123!", "newPassword": "AdminPass123!"}),
    item("List Sessions", "GET", "/auth/sessions"),
    item("Revoke Session", "DELETE", "/auth/sessions/{{sessionId}}"),
    item("Logout", "POST", "/auth/logout"),
    item("OAuth: Google Start", "GET", "/auth/oauth/google", auth=False),
    item("OAuth: GitHub Start", "GET", "/auth/oauth/github", auth=False),
    item("MFA Enroll (501, post-MVP)", "POST", "/auth/mfa/enroll"),
]

# ── Organizations & Members ─────────────────────────────────────────────
org_items = [
    item("List My Organizations", "GET", "/organizations"),
    item("Create Organization", "POST", "/organizations",
         headers=[{"key": "Idempotency-Key", "value": "{{$guid}}"}],
         body={"name": "Acme Ltd", "timezone": "UTC"},
         test_script="""
if (pm.response.code === 201) {
    const data = pm.response.json().data;
    pm.collectionVariables.set("organizationId", data._id);
    pm.collectionVariables.set("organizationEtag", pm.response.headers.get("ETag"));
}
"""),
    item("Get Organization", "GET", "/organizations/{{organizationId}}"),
    item("Update Organization", "PATCH", "/organizations/{{organizationId}}",
         headers=[{"key": "If-Match", "value": "{{organizationEtag}}"}],
         body={"name": "Acme Ltd (renamed)"}),
    item("Delete Organization", "DELETE", "/organizations/{{organizationId}}"),
    item("List Members", "GET", "/organizations/{{organizationId}}/members"),
    item("Invite Member", "POST", "/organizations/{{organizationId}}/invitations",
         headers=[{"key": "Idempotency-Key", "value": "{{$guid}}"}],
         body={"email": "teammate@example.com", "role": "engineer"}),
    item("Update Member Role", "PATCH", "/organizations/{{organizationId}}/members/{{memberId}}", body={"role": "admin"}),
    item("Remove Member", "DELETE", "/organizations/{{organizationId}}/members/{{memberId}}"),
]

# ── Monitors ─────────────────────────────────────────────────────────────
monitor_items = [
    item("List Monitors", "GET", "/monitors?page=1&limit=20", org=True),
    item("Create Monitor", "POST", "/monitors", org=True,
         headers=[{"key": "Idempotency-Key", "value": "{{$guid}}"}],
         body={
             "name": "Login API", "url": "https://api.example.com/login", "method": "POST",
             "expectedStatusCode": 200, "interval": 60, "timeout": 5000,
             "validationRules": [{"path": "$.success", "operator": "equals", "expected": True}],
             "retryPolicy": {"attempts": 3, "delay": 5000},
             "environment": "production", "tags": ["auth", "critical"],
             "region": ["us-east-1", "eu-west-1"],
         },
         test_script="""
if (pm.response.code === 201) {
    const data = pm.response.json().data;
    pm.collectionVariables.set("monitorId", data._id);
    pm.collectionVariables.set("monitorEtag", pm.response.headers.get("ETag"));
}
"""),
    item("Get Monitor", "GET", "/monitors/{{monitorId}}", org=True),
    item("Update Monitor", "PATCH", "/monitors/{{monitorId}}", org=True,
         headers=[{"key": "If-Match", "value": "{{monitorEtag}}"}],
         body={"interval": 30}),
    item("Pause Monitor", "POST", "/monitors/{{monitorId}}/pause", org=True),
    item("Resume Monitor", "POST", "/monitors/{{monitorId}}/resume", org=True),
    item("Test Monitor (all configured regions, ad-hoc, not persisted)", "POST", "/monitors/{{monitorId}}/test", org=True),
    item("Monitor Region Status (multi-region)", "GET", "/monitors/{{monitorId}}/regions", org=True,
         description="Latest independently-checked status per configured region — e.g. us-east-1 healthy, eu-west-1 failing."),
    item("Monitor Health Checks", "GET", "/monitors/{{monitorId}}/health-checks?limit=50", org=True),
    item("Monitor Incidents", "GET", "/monitors/{{monitorId}}/incidents", org=True),
    item("Delete Monitor", "DELETE", "/monitors/{{monitorId}}", org=True),
]

# ── Health Checks ────────────────────────────────────────────────────────
health_items = [
    item("List Health Checks (cursor)", "GET", "/health-checks?monitorId={{monitorId}}&limit=50", org=True),
    item("List Health Checks — filtered by region", "GET", "/health-checks?monitorId={{monitorId}}&region=eu-west-1&limit=50", org=True),
    item("Get Health Check", "GET", "/health-checks/{{healthCheckId}}", org=True),
]

# ── Incidents ────────────────────────────────────────────────────────────
incident_items = [
    item("List Incidents", "GET", "/incidents?status=open", org=True),
    item("Get Incident", "GET", "/incidents/{{incidentId}}", org=True),
    item("Acknowledge Incident", "POST", "/incidents/{{incidentId}}/acknowledge", org=True),
    item("Resolve Incident (manual override)", "POST", "/incidents/{{incidentId}}/resolve", org=True),
    item("Incident AI Intelligence (root cause + suggested fixes)", "GET", "/incidents/{{incidentId}}/summary", org=True,
         description="Returns aiSummary, aiRootCause { confidence, findings }, and aiSuggestedFixes."),
    item("Incident Timeline", "GET", "/incidents/{{incidentId}}/timeline", org=True,
         description="Unified chronological view: leading health-check signal, open, notifications, acknowledge, close, AI analysis."),
]

# ── SSL Certificates & Domains ───────────────────────────────────────────
ssl_domain_items = [
    item("List SSL Certificates", "GET", "/ssl-certificates", org=True),
    item("Get SSL Certificate", "GET", "/ssl-certificates/{{sslCertificateId}}", org=True),
    item("Recheck SSL Certificate", "POST", "/ssl-certificates/{{sslCertificateId}}/recheck", org=True),
    item("List Domains", "GET", "/domains", org=True),
    item("Track Domain", "POST", "/domains", org=True, body={"domainName": "example.com", "registrar": "Namecheap"},
         test_script="""
if (pm.response.code === 201) {
    pm.collectionVariables.set("domainId", pm.response.json().data._id);
}
"""),
    item("Get Domain", "GET", "/domains/{{domainId}}", org=True),
    item("Recheck Domain", "POST", "/domains/{{domainId}}/recheck", org=True),
    item("Delete Domain", "DELETE", "/domains/{{domainId}}", org=True),
]

# ── Status Pages ─────────────────────────────────────────────────────────
status_page_items = [
    item("List Status Pages", "GET", "/status-pages", org=True),
    item("Create Status Page", "POST", "/status-pages", org=True,
         body={"title": "Acme Status", "isPublic": True, "monitorIds": ["{{monitorId}}"]},
         test_script="""
if (pm.response.code === 201) {
    const data = pm.response.json().data;
    pm.collectionVariables.set("statusPageId", data._id);
    pm.collectionVariables.set("statusPageSlug", data.slug);
}
"""),
    item("Get Status Page (private, by ID)", "GET", "/status-pages/{{statusPageId}}", org=True),
    item("Update Status Page", "PATCH", "/status-pages/{{statusPageId}}",
         headers=[{"key": "If-Match", "value": "{{statusPageEtag}}"}],
         body={"title": "Acme Status (updated)"}, org=True),
    item("Delete Status Page", "DELETE", "/status-pages/{{statusPageId}}", org=True),
    item("Get Public Status Page (by slug, unauthenticated)", "GET", "/status-pages/{{statusPageSlug}}", auth=False),
]

# ── Notification Channels & Notifications ────────────────────────────────
notif_items = [
    item("List Notification Channels", "GET", "/notification-channels", org=True),
    item("Create Notification Channel (Slack)", "POST", "/notification-channels", org=True,
         body={"name": "#incidents", "type": "slack", "configuration": {"webhookUrl": "https://hooks.slack.com/services/REPLACE/ME"}},
         test_script="""
if (pm.response.code === 201) {
    pm.collectionVariables.set("notificationChannelId", pm.response.json().data._id);
}
"""),
    item("Update Notification Channel", "PATCH", "/notification-channels/{{notificationChannelId}}", org=True,
         headers=[{"key": "If-Match", "value": "{{notificationChannelEtag}}"}], body={"enabled": True}),
    item("Test Notification Channel", "POST", "/notification-channels/{{notificationChannelId}}/test", org=True),
    item("Delete Notification Channel", "DELETE", "/notification-channels/{{notificationChannelId}}", org=True),
    item("List Notifications (delivery history)", "GET", "/notifications?page=1&limit=20", org=True),
    item("Get Notification", "GET", "/notifications/{{notificationId}}", org=True),
]

# ── API Keys ─────────────────────────────────────────────────────────────
apikey_items = [
    item("List API Keys", "GET", "/api-keys", org=True),
    item("Create API Key", "POST", "/api-keys", org=True, body={"name": "CI Pipeline"},
         test_script="""
if (pm.response.code === 201) {
    const data = pm.response.json().data;
    pm.collectionVariables.set("apiKeyId", data._id);
    pm.collectionVariables.set("rawApiKey", data.rawKey);
}
"""),
    item("Rotate API Key", "POST", "/api-keys/{{apiKeyId}}/rotate", org=True),
    item("Delete API Key", "DELETE", "/api-keys/{{apiKeyId}}", org=True),
]

# ── Audit Logs ───────────────────────────────────────────────────────────
audit_items = [
    item("List Audit Logs", "GET", "/audit-logs?page=1&limit=25", org=True),
    item("Get Audit Log Entry", "GET", "/audit-logs/{{auditLogId}}", org=True),
]

# ── Analytics ────────────────────────────────────────────────────────────
analytics_items = [
    item("Overview", "GET", "/analytics/overview", org=True),
    item("Uptime", "GET", "/analytics/uptime?monitorId={{monitorId}}", org=True),
    item("Latency", "GET", "/analytics/latency?monitorId={{monitorId}}", org=True),
    item("Incidents Analytics", "GET", "/analytics/incidents", org=True),
]

# ── Billing ──────────────────────────────────────────────────────────────
billing_items = [
    item("List Plans", "GET", "/billing/plans", org=True),
    item("Get Subscription", "GET", "/billing/subscription", org=True),
    item("Start Checkout", "POST", "/billing/checkout", org=True, body={"planKey": "pro"}),
    item("List Invoices", "GET", "/billing/invoices", org=True),
]

# ── Misc ─────────────────────────────────────────────────────────────────
misc_items = [
    item("Health Check (liveness)", "GET", "/../../health", auth=False),
]
# fix the liveness path manually (it's outside /api/v1)
misc_items[0]["request"]["url"] = {"raw": f"{BASE}/health", "host": [BASE], "path": ["health"]}

collection = {
    "info": {
        "_postman_id": str(uuid.uuid4()),
        "name": "PulseWatch API",
        "description": "Full PulseWatch backend API — see docs/API_Specification.md and docs/API_REFERENCE.md in the repo. Run 'Login' first (or after 'npm run seed:demo' on the backend) to populate {{accessToken}}, then 'Create Organization' to populate {{organizationId}}, then the rest of the collection in order.",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "variable": [
        {"key": "baseUrl", "value": "http://localhost:4000"},
        {"key": "accessToken", "value": ""},
        {"key": "refreshToken", "value": ""},
        {"key": "organizationId", "value": ""},
        {"key": "organizationEtag", "value": ""},
        {"key": "monitorId", "value": ""},
        {"key": "monitorEtag", "value": ""},
        {"key": "healthCheckId", "value": ""},
        {"key": "incidentId", "value": ""},
        {"key": "sslCertificateId", "value": ""},
        {"key": "domainId", "value": ""},
        {"key": "statusPageId", "value": ""},
        {"key": "statusPageEtag", "value": ""},
        {"key": "statusPageSlug", "value": ""},
        {"key": "notificationChannelId", "value": ""},
        {"key": "notificationChannelEtag", "value": ""},
        {"key": "notificationId", "value": ""},
        {"key": "apiKeyId", "value": ""},
        {"key": "rawApiKey", "value": ""},
        {"key": "auditLogId", "value": ""},
        {"key": "userId", "value": ""},
        {"key": "sessionId", "value": ""},
        {"key": "memberId", "value": ""},
        {"key": "emailVerificationToken", "value": ""},
        {"key": "resetToken", "value": ""},
    ],
    "item": [
        folder("Auth", auth_items, "Register/login/refresh/OAuth/sessions. Run Login first."),
        folder("Organizations & Members", org_items),
        folder("Monitors", monitor_items),
        folder("Health Checks", health_items, "Cursor-paginated — the highest-volume collection."),
        folder("Incidents", incident_items),
        folder("SSL Certificates & Domains", ssl_domain_items),
        folder("Status Pages", status_page_items, "Note the dual-purpose GET /status-pages/:slug — public unauthenticated by slug, private by ID when authenticated."),
        folder("Notification Channels & Notifications", notif_items),
        folder("API Keys", apikey_items),
        folder("Audit Logs", audit_items, "Read-only."),
        folder("Analytics", analytics_items),
        folder("Billing", billing_items),
        folder("Misc", misc_items),
    ],
}

with open("PulseWatch.postman_collection.json", "w") as f:
    json.dump(collection, f, indent=2)

print("Wrote PulseWatch.postman_collection.json")
