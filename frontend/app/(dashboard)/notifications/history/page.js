"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import { PageSpinner } from "@/components/ui/Spinner";
import { useResource } from "@/lib/useResource";
import { useOrg } from "@/lib/OrgContext";
import { formatDate } from "@/lib/format";

export default function NotificationHistoryPage() {
  const { currentOrgId } = useOrg();
  const [page, setPage] = useState(1);
  const { data: notifications, meta, loading } = useResource(currentOrgId ? "/notifications" : null, { params: { page, limit: 20 }, deps: [currentOrgId, page] });

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-4">
      <Link href="/notifications" className="flex w-fit items-center gap-1 text-sm text-muted hover:text-foreground"><ArrowLeft size={14} /> Back to channels</Link>
      <Card>
        <Table
          columns={[
            { key: "eventType", header: "Event", className: "font-mono text-xs" },
            { key: "recipient", header: "Recipient", className: "text-sm" },
            { key: "status", header: "Status", render: (n) => <Badge status={n.status} /> },
            { key: "attempts", header: "Attempts", className: "font-mono text-xs" },
            { key: "sentAt", header: "Sent", render: (n) => <span className="text-xs text-muted">{n.sentAt ? formatDate(n.sentAt) : "—"}</span> },
          ]}
          rows={notifications || []}
          emptyMessage="No notifications sent yet."
        />
        <Pagination page={page} totalPages={meta?.totalPages} onChange={setPage} />
      </Card>
    </div>
  );
}
