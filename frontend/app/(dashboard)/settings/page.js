"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { api } from "@/lib/apiClient";
import { useOrg, hasRole } from "@/lib/OrgContext";

export default function OrgSettingsPage() {
  const { currentOrgId, role, refresh } = useOrg();
  const router = useRouter();
  const [org, setOrg] = useState(null);
  const [etag, setEtag] = useState(null);
  const [form, setForm] = useState({ name: "", timezone: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentOrgId) return;
    api.get(`/organizations/${currentOrgId}`).then(({ data, etag: tag }) => {
      setOrg(data);
      setEtag(tag);
      setForm({ name: data.name, timezone: data.timezone });
    });
  }, [currentOrgId]);

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data, etag: newTag } = await api.patch(`/organizations/${currentOrgId}`, form, { ifMatch: etag });
      setOrg(data);
      setEtag(newTag);
      toast.success("Organization updated.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm(`Delete "${org.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/organizations/${currentOrgId}`);
      toast.success("Organization deleted.");
      await refresh();
      router.push("/organizations");
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (!org) return <PageSpinner />;
  const canManage = hasRole(role, "admin");

  return (
    <div className="max-w-lg space-y-6">
      <Card className="p-6">
        <h2 className="font-display text-lg font-semibold">Organization settings</h2>
        <form onSubmit={onSave} className="mt-4 space-y-4">
          <Input label="Name" required disabled={!canManage} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Timezone" disabled={!canManage} value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
          {canManage && <Button type="submit" loading={saving}>Save changes</Button>}
        </form>
      </Card>

      {hasRole(role, "owner") && (
        <Card className="border-unhealthy/30 p-6">
          <h2 className="font-display text-sm font-semibold text-unhealthy">Danger zone</h2>
          <p className="mt-1 text-sm text-muted">Deleting an organization soft-deletes all of its monitors, incidents, and data.</p>
          <Button variant="danger" className="mt-4" onClick={onDelete}>Delete organization</Button>
        </Card>
      )}
    </div>
  );
}
