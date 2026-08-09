"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { UserPlus, Trash2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { useResource } from "@/lib/useResource";
import { useOrg, hasRole } from "@/lib/OrgContext";
import { api } from "@/lib/apiClient";

export default function MembersPage() {
  const { currentOrgId, role } = useOrg();
  const { data: members, loading, refetch } = useResource(currentOrgId ? `/organizations/${currentOrgId}/members` : null, { deps: [currentOrgId] });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ email: "", role: "viewer" });
  const [submitting, setSubmitting] = useState(false);
  const canManage = hasRole(role, "admin");

  async function onInvite(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/organizations/${currentOrgId}/invitations`, form);
      toast.success("Invitation sent.");
      setInviteOpen(false);
      setForm({ email: "", role: "viewer" });
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onRoleChange(memberId, newRole) {
    try {
      await api.patch(`/organizations/${currentOrgId}/members/${memberId}`, { role: newRole });
      toast.success("Role updated.");
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function onRemove(memberId) {
    if (!confirm("Remove this member from the organization?")) return;
    try {
      await api.delete(`/organizations/${currentOrgId}/members/${memberId}`);
      toast.success("Member removed.");
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage && <Button size="sm" onClick={() => setInviteOpen(true)}><UserPlus size={14} /> Invite member</Button>}
      </div>

      <Card>
        <Table
          columns={[
            { key: "user", header: "Member", render: (m) => (m.userId ? `${m.userId.firstName} ${m.userId.lastName}` : m.invitedEmail) },
            { key: "email", header: "Email", render: (m) => m.userId?.email || m.invitedEmail },
            {
              key: "role", header: "Role", render: (m) =>
                canManage && m.role !== "owner" ? (
                  <Select value={m.role} onChange={(e) => onRoleChange(m._id, e.target.value)} className="w-32">
                    <option value="admin">Admin</option>
                    <option value="engineer">Engineer</option>
                    <option value="viewer">Viewer</option>
                  </Select>
                ) : <Badge status="active">{m.role}</Badge>,
            },
            { key: "status", header: "Status", render: (m) => <Badge status={m.status === "active" ? "active" : "pending"}>{m.status}</Badge> },
            {
              key: "actions", header: "", className: "text-right", render: (m) =>
                canManage && m.role !== "owner" && (
                  <button onClick={() => onRemove(m._id)} className="text-faint hover:text-unhealthy"><Trash2 size={15} /></button>
                ),
            },
          ]}
          rows={members || []}
          emptyMessage="No members yet."
        />
      </Card>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite a member">
        <form onSubmit={onInvite} className="space-y-4">
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="admin">Admin</option>
            <option value="engineer">Engineer</option>
            <option value="viewer">Viewer</option>
          </Select>
          <Button type="submit" className="w-full" loading={submitting}>Send invitation</Button>
        </form>
      </Modal>
    </div>
  );
}
