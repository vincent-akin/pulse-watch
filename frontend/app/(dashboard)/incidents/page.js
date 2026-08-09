"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import { useResource } from "@/lib/useResource";
import { useOrg } from "@/lib/OrgContext";
import { formatDate, formatDuration } from "@/lib/format";

export default function IncidentsPage() {
  const { currentOrgId } = useOrg();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");

  const { data: incidents, meta, loading } = useResource(currentOrgId ? "/incidents" : null, {
    params: { page, limit: 20, status, severity },
    deps: [currentOrgId, page, status, severity],
  });

  if (loading && !incidents) return <PageSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-40">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </Select>
        <Select value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1); }} className="w-40">
          <option value="">All severities</option>
          <option value="critical">Critical</option>
          <option value="major">Major</option>
          <option value="minor">Minor</option>
        </Select>
      </div>

      <Card>
        {incidents && incidents.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="No incidents" description="Nothing has fired yet — that's a good sign." />
        ) : (
          <>
            <Table
              onRowClick={(i) => router.push(`/incidents/${i._id}`)}
              columns={[
                { key: "severity", header: "Severity", render: (i) => <Badge status={i.severity} /> },
                { key: "status", header: "Status", render: (i) => <Badge status={i.status} /> },
                { key: "failureReason", header: "Reason", className: "max-w-sm truncate text-sm" },
                { key: "startedAt", header: "Started", render: (i) => <span className="font-mono text-xs">{formatDate(i.startedAt)}</span> },
                { key: "duration", header: "Duration", render: (i) => <span className="font-mono text-xs">{i.duration ? formatDuration(i.duration) : "ongoing"}</span> },
              ]}
              rows={incidents || []}
            />
            <Pagination page={page} totalPages={meta?.totalPages} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
