"use client";
import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, Send, Trash2, History } from "lucide-react";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import { BellRing } from "lucide-react";
import ChannelForm from "@/components/notifications/ChannelForm";
import { useResource } from "@/lib/useResource";
import { useOrg, hasRole } from "@/lib/OrgContext";
import { api } from "@/lib/apiClient";

export default function NotificationChannelsPage() {
  const { currentOrgId, role } = useOrg();
  const { data: channels, loading, refetch } = useResource(currentOrgId ? "/notification-channels" : null, { deps: [currentOrgId] });
  const [open, setOpen] = useState(false);
  const canManage = hasRole(role, "admin");

  async function handleCreate(payload) {
    await api.post("/notification-channels", payload);
    toast.success("Channel created.");
    setOpen(false);
    refetch();
  }

  async function test(id) {
    try { await api.post(`/notification-channels/${id}/test`); toast.success("Test notification sent."); }
    catch (err) { toast.error(err.message); }
  }

  async function remove(id) {
    if (!confirm("Delete this notification channel?")) return;
    try { await api.delete(`/notification-channels/${id}`); toast.success("Channel deleted."); refetch(); }
    catch (err) { toast.error(err.message); }
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Link href="/notifications/history" className="flex items-center gap-1 text-sm text-accent hover:underline"><History size={14} /> View delivery history</Link>
        {canManage && <Button size="sm" onClick={() => setOpen(true)}><Plus size={14} /> New channel</Button>}
      </div>

      <Card>
        {channels && channels.length === 0 ? (
          <EmptyState icon={BellRing} title="No notification channels" description="Add email, Slack, Discord, or a generic webhook to get alerted." />
        ) : (
          <Table
            columns={[
              { key: "name", header: "Name" },
              { key: "type", header: "Type", className: "capitalize text-muted" },
              { key: "enabled", header: "Status", render: (c) => <Badge status={c.enabled ? "active" : "paused"}>{c.enabled ? "Enabled" : "Disabled"}</Badge> },
              { key: "actions", header: "", className: "text-right whitespace-nowrap", render: (c) => (
                <div className="flex justify-end gap-2">
                  <button onClick={() => test(c._id)} className="text-faint hover:text-accent"><Send size={14} /></button>
                  {canManage && <button onClick={() => remove(c._id)} className="text-faint hover:text-unhealthy"><Trash2 size={14} /></button>}
                </div>
              )},
            ]}
            rows={channels || []}
          />
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New notification channel">
        <ChannelForm onSubmit={handleCreate} />
      </Modal>
    </div>
  );
}
