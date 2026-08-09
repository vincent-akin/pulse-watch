"use client";
import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useResource } from "@/lib/useResource";
import { useOrg } from "@/lib/OrgContext";

export default function StatusPageForm({ initial, onSubmit, submitLabel = "Create status page" }) {
  const { currentOrgId } = useOrg();
  const { data: monitors } = useResource(currentOrgId ? "/monitors" : null, { params: { limit: 100 }, deps: [currentOrgId] });
  const [form, setForm] = useState(initial || { title: "", slug: "", isPublic: true, monitorIds: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function toggleMonitor(id) {
    setForm((f) => ({
      ...f,
      monitorIds: f.monitorIds.includes(id) ? f.monitorIds.filter((m) => m !== id) : [...f.monitorIds, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      {!initial && <Input label="Slug (optional — auto-generated if blank)" value={form.slug || ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} />}
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} className="accent-accent" />
        Publicly visible
      </label>

      <div>
        <p className="mb-2 text-xs font-medium text-muted">Monitors to display</p>
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
          {(monitors || []).map((m) => (
            <label key={m._id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-elevated">
              <input type="checkbox" checked={form.monitorIds.includes(m._id)} onChange={() => toggleMonitor(m._id)} className="accent-accent" />
              {m.name}
            </label>
          ))}
          {monitors?.length === 0 && <p className="px-2 py-2 text-sm text-faint">No monitors yet.</p>}
        </div>
      </div>

      {error && <p className="text-sm text-unhealthy">{error}</p>}
      <Button type="submit" loading={loading}>{submitLabel}</Button>
    </form>
  );
}
