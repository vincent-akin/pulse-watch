"use client";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import { PageSpinner } from "@/components/ui/Spinner";
import { useResource } from "@/lib/useResource";
import { api } from "@/lib/apiClient";
import { formatDate } from "@/lib/format";

export default function SessionsPage() {
  const { data: sessions, loading, refetch } = useResource("/auth/sessions");

  async function revoke(id) {
    try {
      await api.delete(`/auth/sessions/${id}`);
      toast.success("Session revoked.");
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading) return <PageSpinner />;

  return (
    <Card className="max-w-2xl">
      <Table
        columns={[
          { key: "userAgent", header: "Device", render: (s) => <span className="text-xs">{s.userAgent?.slice(0, 60) || "Unknown device"}</span> },
          { key: "ipAddress", header: "IP", className: "font-mono text-xs" },
          { key: "lastActiveAt", header: "Last active", render: (s) => formatDate(s.lastActiveAt) },
          { key: "actions", header: "", className: "text-right", render: (s) => (
            <button onClick={() => revoke(s._id)} className="text-faint hover:text-unhealthy"><Trash2 size={15} /></button>
          )},
        ]}
        rows={sessions || []}
        emptyMessage="No active sessions."
      />
    </Card>
  );
}
