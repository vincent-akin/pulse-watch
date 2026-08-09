"use client";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Input from "@/components/ui/Input";
import Pagination from "@/components/ui/Pagination";
import { PageSpinner } from "@/components/ui/Spinner";
import { useResource } from "@/lib/useResource";
import { useOrg } from "@/lib/OrgContext";
import { formatDate } from "@/lib/format";

export default function AuditLogsPage() {
  const { currentOrgId } = useOrg();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");

  const { data: logs, meta, loading } = useResource(currentOrgId ? "/audit-logs" : null, {
    params: { page, limit: 25, action },
    deps: [currentOrgId, page, action],
  });

  if (loading && !logs) return <PageSpinner />;

  return (
    <div className="space-y-4">
      <Input placeholder="Filter by action (e.g. monitor.created)" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="max-w-xs" />
      <Card>
        <Table
          columns={[
            { key: "action", header: "Action", className: "font-mono text-xs" },
            { key: "resource", header: "Resource", className: "text-xs text-muted" },
            { key: "ipAddress", header: "IP", className: "font-mono text-xs" },
            { key: "createdAt", header: "When", render: (l) => <span className="text-xs text-muted">{formatDate(l.createdAt)}</span> },
          ]}
          rows={logs || []}
          emptyMessage="No audit log entries."
        />
        <Pagination page={page} totalPages={meta?.totalPages} onChange={setPage} />
      </Card>
    </div>
  );
}
