"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, RotateCw, Trash2, KeyRound, Copy } from "lucide-react";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import EmptyState from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import { useResource } from "@/lib/useResource";
import { useOrg } from "@/lib/OrgContext";
import { api } from "@/lib/apiClient";
import { formatDate } from "@/lib/format";

export default function ApiKeysPage() {
  const { currentOrgId } = useOrg();
  const { data: keys, loading, refetch } = useResource(currentOrgId ? "/api-keys" : null, { deps: [currentOrgId] });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [revealedKey, setRevealedKey] = useState(null);

  async function onCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post("/api-keys", { name });
      setRevealedKey(data.rawKey);
      setName("");
      refetch();
    } catch (err) { toast.error(err.message); } finally { setSubmitting(false); }
  }

  async function rotate(id) {
    if (!confirm("Rotate this key? The old key will stop working immediately.")) return;
    try {
      const { data } = await api.post(`/api-keys/${id}/rotate`);
      setRevealedKey(data.rawKey);
      setOpen(true);
      refetch();
    } catch (err) { toast.error(err.message); }
  }

  async function remove(id) {
    if (!confirm("Delete this API key?")) return;
    try { await api.delete(`/api-keys/${id}`); toast.success("API key deleted."); refetch(); }
    catch (err) { toast.error(err.message); }
  }

  function copy(value) {
    navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard.");
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}><Plus size={14} /> New API key</Button>
      </div>

      <Card>
        {keys && keys.length === 0 ? (
          <EmptyState icon={KeyRound} title="No API keys" description="Create a key to access the PulseWatch API programmatically." />
        ) : (
          <Table
            columns={[
              { key: "name", header: "Name" },
              { key: "keyPrefix", header: "Prefix", className: "font-mono text-xs" },
              { key: "lastUsedAt", header: "Last used", render: (k) => <span className="text-xs text-muted">{k.lastUsedAt ? formatDate(k.lastUsedAt) : "Never"}</span> },
              { key: "createdAt", header: "Created", render: (k) => <span className="text-xs text-muted">{formatDate(k.createdAt)}</span> },
              { key: "actions", header: "", className: "text-right whitespace-nowrap", render: (k) => (
                <div className="flex justify-end gap-2">
                  <button onClick={() => rotate(k._id)} className="text-faint hover:text-accent"><RotateCw size={14} /></button>
                  <button onClick={() => remove(k._id)} className="text-faint hover:text-unhealthy"><Trash2 size={14} /></button>
                </div>
              )},
            ]}
            rows={keys || []}
          />
        )}
      </Card>

      <Modal open={open} onClose={() => { setOpen(false); setRevealedKey(null); }} title="New API key">
        {revealedKey ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">Copy this key now — it won&apos;t be shown again.</p>
            <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
              <span className="truncate">{revealedKey}</span>
              <button onClick={() => copy(revealedKey)}><Copy size={14} className="text-faint hover:text-accent" /></button>
            </div>
            <Button className="w-full" onClick={() => { setOpen(false); setRevealedKey(null); }}>Done</Button>
          </div>
        ) : (
          <form onSubmit={onCreate} className="space-y-4">
            <Input label="Name" required placeholder="CI Pipeline" value={name} onChange={(e) => setName(e.target.value)} />
            <Button type="submit" className="w-full" loading={submitting}>Create key</Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
