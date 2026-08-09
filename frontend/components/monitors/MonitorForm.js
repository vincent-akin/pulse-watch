"use client";
import { useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";

function toText(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function parseJsonField(text, fallback) {
  if (!text || !text.trim()) return fallback;
  return JSON.parse(text);
}

const DEFAULTS = {
  name: "", description: "", url: "", method: "GET", environment: "production",
  interval: 60, timeout: 5000, expectedStatusCode: 200, enabled: true,
  tags: "", region: "us-east-1",
  headersText: "{}", bodyText: "", queryParametersText: "{}",
  authType: "none", authCredentialsText: "{}",
  validationRulesText: "[]",
  retryAttempts: 3, retryDelay: 5000,
};

export function monitorToFormState(monitor) {
  if (!monitor) return DEFAULTS;
  return {
    name: monitor.name, description: monitor.description || "", url: monitor.url, method: monitor.method,
    environment: monitor.environment, interval: monitor.interval, timeout: monitor.timeout,
    expectedStatusCode: monitor.expectedStatusCode, enabled: monitor.enabled,
    tags: (monitor.tags || []).join(", "), region: (monitor.region || []).join(", "),
    headersText: toText(monitor.headers || {}), bodyText: toText(monitor.body),
    queryParametersText: toText(monitor.queryParameters || {}),
    authType: monitor.authentication?.type || "none",
    authCredentialsText: toText(monitor.authentication?.credentials || {}),
    validationRulesText: toText(monitor.validationRules || []),
    retryAttempts: monitor.retryPolicy?.attempts ?? 3, retryDelay: monitor.retryPolicy?.delay ?? 5000,
  };
}

export function formStateToPayload(form) {
  return {
    name: form.name,
    description: form.description,
    url: form.url,
    method: form.method,
    environment: form.environment,
    interval: Number(form.interval),
    timeout: Number(form.timeout),
    expectedStatusCode: Number(form.expectedStatusCode),
    enabled: form.enabled,
    tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    region: form.region.split(",").map((t) => t.trim()).filter(Boolean),
    headers: parseJsonField(form.headersText, {}),
    body: form.bodyText.trim() ? parseJsonField(form.bodyText, undefined) : undefined,
    queryParameters: parseJsonField(form.queryParametersText, {}),
    authentication: { type: form.authType, credentials: form.authType !== "none" ? parseJsonField(form.authCredentialsText, {}) : {} },
    validationRules: parseJsonField(form.validationRulesText, []),
    retryPolicy: { attempts: Number(form.retryAttempts), delay: Number(form.retryDelay) },
  };
}

export default function MonitorForm({ initial, onSubmit, submitLabel = "Create monitor" }) {
  const [form, setForm] = useState(initial || DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = formStateToPayload(form);
      await onSubmit(payload);
    } catch (err) {
      setError(err.errors?.length ? err.errors.map((x) => `${x.field}: ${x.message}`).join(" · ") : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Basics</h3>
        <Input label="Name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
        <Textarea label="Description" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
        <div className="grid grid-cols-3 gap-3">
          <Select label="Method" value={form.method} onChange={(e) => set("method", e.target.value)} className="col-span-1">
            {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Input label="URL" required type="url" placeholder="https://api.example.com/health" value={form.url} onChange={(e) => set("url", e.target.value)} className="col-span-2" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Select label="Environment" value={form.environment} onChange={(e) => set("environment", e.target.value)}>
            {["production", "staging", "development"].map((e2) => <option key={e2} value={e2}>{e2}</option>)}
          </Select>
          <Input label="Interval (seconds)" type="number" min={10} required value={form.interval} onChange={(e) => set("interval", e.target.value)} />
          <Input label="Timeout (ms)" type="number" min={1000} required value={form.timeout} onChange={(e) => set("timeout", e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Expected status code" type="number" value={form.expectedStatusCode} onChange={(e) => set("expectedStatusCode", e.target.value)} />
          <Input label="Regions to check from" placeholder="us-east-1, eu-west-1" value={form.region} onChange={(e) => set("region", e.target.value)} />
          <Input label="Tags (comma-separated)" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
        </div>
        <p className="-mt-2 text-xs text-faint">
          Each region checks independently on its own schedule — add more than one to see whether an
          outage is global or localized (e.g. only eu-west-1 failing while us-east-1 stays healthy).
        </p>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} className="accent-accent" />
          Enabled
        </label>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Request configuration</h3>
        <Textarea label="Headers (JSON)" rows={3} value={form.headersText} onChange={(e) => set("headersText", e.target.value)} />
        <Textarea label="Query parameters (JSON)" rows={2} value={form.queryParametersText} onChange={(e) => set("queryParametersText", e.target.value)} />
        {["POST", "PUT", "PATCH"].includes(form.method) && (
          <Textarea label="Body (JSON)" rows={3} value={form.bodyText} onChange={(e) => set("bodyText", e.target.value)} />
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Authentication</h3>
        <Select label="Type" value={form.authType} onChange={(e) => set("authType", e.target.value)}>
          <option value="none">None</option>
          <option value="basic">Basic</option>
          <option value="bearer">Bearer token</option>
          <option value="apiKey">API key header</option>
        </Select>
        {form.authType !== "none" && (
          <Textarea
            label="Credentials (JSON)"
            rows={2}
            placeholder={form.authType === "bearer" ? '{"token": "..."}' : form.authType === "basic" ? '{"username": "...", "password": "..."}' : '{"headerName": "X-API-Key", "value": "..."}'}
            value={form.authCredentialsText}
            onChange={(e) => set("authCredentialsText", e.target.value)}
          />
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Validation & retries</h3>
        <Textarea
          label='Validation rules (JSON array of { path, operator, expected })'
          rows={3}
          placeholder='[{"path": "$.success", "operator": "equals", "expected": true}]'
          value={form.validationRulesText}
          onChange={(e) => set("validationRulesText", e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Retry attempts" type="number" min={0} max={10} value={form.retryAttempts} onChange={(e) => set("retryAttempts", e.target.value)} />
          <Input label="Retry delay (ms)" type="number" min={0} value={form.retryDelay} onChange={(e) => set("retryDelay", e.target.value)} />
        </div>
      </section>

      {error && <p className="text-sm text-unhealthy">{error}</p>}
      <Button type="submit" loading={loading}>{submitLabel}</Button>
    </form>
  );
}
