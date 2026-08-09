"use client";
import { useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

const DEFAULTS = { name: "", type: "email", enabled: true, emailTo: "", webhookUrl: "", genericUrl: "" };

export default function ChannelForm({ onSubmit, submitLabel = "Create channel" }) {
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let configuration;
      if (form.type === "email") configuration = { to: form.emailTo.split(",").map((s) => s.trim()).filter(Boolean) };
      else if (form.type === "slack" || form.type === "discord") configuration = { webhookUrl: form.webhookUrl };
      else configuration = { url: form.genericUrl };

      await onSubmit({ name: form.name, type: form.type, enabled: form.enabled, configuration });
    } catch (err) {
      setError(err.errors?.length ? err.errors.map((x) => x.message).join(" · ") : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
        <option value="email">Email</option>
        <option value="slack">Slack</option>
        <option value="discord">Discord</option>
        <option value="webhook">Generic webhook</option>
      </Select>

      {form.type === "email" && (
        <Input label="Recipients (comma-separated)" required placeholder="team@example.com" value={form.emailTo} onChange={(e) => setForm({ ...form, emailTo: e.target.value })} />
      )}
      {(form.type === "slack" || form.type === "discord") && (
        <Input label="Webhook URL" required type="url" value={form.webhookUrl} onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })} />
      )}
      {form.type === "webhook" && (
        <Input label="Endpoint URL" required type="url" value={form.genericUrl} onChange={(e) => setForm({ ...form, genericUrl: e.target.value })} />
      )}

      {error && <p className="text-sm text-unhealthy">{error}</p>}
      <Button type="submit" loading={loading}>{submitLabel}</Button>
    </form>
  );
}
