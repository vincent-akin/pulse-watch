"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Trash2, Plus, Globe2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import EmptyState from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import { useResource } from "@/lib/useResource";
import { useOrg, hasRole } from "@/lib/OrgContext";
import { api } from "@/lib/apiClient";
import { formatDate } from "@/lib/format";

export default function DomainsPage() {
  const { currentOrgId, role } = useOrg();
  const { data: domains, loading, refetch } = useResource(currentOrgId ? "/domains" : null, { params: { limit: 100 }, deps: [currentOrgId] });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ domainName: "", registrar: "" });
  const [submitting, setSubmitting] = useState(false);
  const canManage = hasRole(role, "admin");

  async function onCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/domains", form);
      toast.success("Domain added.");
      setOpen(false);
      setForm({ domainName: "", registrar: "" });
      refetch();
    } catch (err) { toast.error(err.message); } finally { setSubmitting(false); }
  }

  async function recheck(id) {
    try { await api.post(`/domains/${id}/recheck`); toast.success("Recheck queued."); setTimeout(refetch, 1500); }
    catch (err) { toast.error(err.message); }
  }

  async function remove(id) {
    if (!confirm("Stop tracking this domain?")) return;
    try { await api.delete(`/domains/${id}`); toast.success("Domain removed."); refetch(); }
    catch (err) { toast.error(err.message); }
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setOpen(true)}><Plus size={14} /> Track domain</Button>
        </div>
      )}

      <Card>
        {domains && domains.length === 0 ? (
          <EmptyState icon={Globe2} title="No domains tracked" description="Domain tracking is opt-in and independent of your monitor count." />
        ) : (
          <Table
            columns={[
              { key: "domainName", header: "Domain", className: "font-mono text-sm" },
              { key: "registrar", header: "Registrar", className: "text-sm text-muted" },
              { key: "status", header: "Status", render: (d) => <Badge status={d.status} /> },
              { key: "expiresAt", header: "Expires", render: (d) => <span className="font-mono text-xs">{formatDate(d.expiresAt)}</span> },
              { key: "lastCheckedAt", header: "Last checked", render: (d) => <span className="text-xs text-muted">{formatDate(d.lastCheckedAt)}</span> },
              { key: "actions", header: "", className: "text-right whitespace-nowrap", render: (d) => (
                <div className="flex justify-end gap-2">
                  <button onClick={() => recheck(d._id)} className="text-faint hover:text-accent"><RefreshCw size={14} /></button>
                  {canManage && <button onClick={() => remove(d._id)} className="text-faint hover:text-unhealthy"><Trash2 size={14} /></button>}
                </div>
              )},
            ]}
            rows={domains || []}
          />
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Track a domain">
        <form onSubmit={onCreate} className="space-y-4">
          <Input label="Domain name" required placeholder="example.com" value={form.domainName} onChange={(e) => setForm({ ...form, domainName: e.target.value })} />
          <Input label="Registrar (optional)" value={form.registrar} onChange={(e) => setForm({ ...form, registrar: e.target.value })} />
          <Button type="submit" className="w-full" loading={submitting}>Track domain</Button>
        </form>
      </Modal>
    </div>
  );
}
