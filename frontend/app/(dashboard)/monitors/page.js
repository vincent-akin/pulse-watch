"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import { Activity } from "lucide-react";
import { useResource } from "@/lib/useResource";
import { useOrg } from "@/lib/OrgContext";
import { formatRelative } from "@/lib/format";

export default function MonitorsPage() {
  const { currentOrgId } = useOrg();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const { data: monitors, meta, loading } = useResource(currentOrgId ? "/monitors" : null, {
    params: { page, limit: 20, search, status, sort: "createdAt:desc" },
    deps: [currentOrgId, page, search, status],
  });

  if (loading && !monitors) return <PageSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <Input className="pl-8" placeholder="Search monitors..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-40">
          <option value="">All statuses</option>
          <option value="healthy">Healthy</option>
          <option value="degraded">Degraded</option>
          <option value="unhealthy">Unhealthy</option>
          <option value="unknown">Unknown</option>
        </Select>
        <Link href="/monitors/new"><Button size="sm"><Plus size={14} /> New monitor</Button></Link>
      </div>

      <Card>
        {monitors && monitors.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No monitors yet"
            description="Add your first monitor to start validating responses, not just pings."
            action={<Link href="/monitors/new"><Button size="sm">Create a monitor</Button></Link>}
          />
        ) : (
          <>
            <Table
              onRowClick={(m) => { window.location.href = `/monitors/${m._id}`; }}
              columns={[
                { key: "name", header: "Monitor", render: (m) => (
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="font-mono text-xs text-muted truncate max-w-xs">{m.url}</p>
                  </div>
                )},
                { key: "status", header: "Status", render: (m) => <Badge status={m.status} /> },
                { key: "environment", header: "Environment", className: "capitalize text-muted" },
                { key: "interval", header: "Interval", render: (m) => <span className="font-mono text-xs">{m.interval}s</span> },
                { key: "enabled", header: "Enabled", render: (m) => <Badge status={m.enabled ? "active" : "paused"}>{m.enabled ? "Enabled" : "Paused"}</Badge> },
                { key: "createdAt", header: "Created", render: (m) => <span className="text-xs text-muted">{formatRelative(m.createdAt)}</span> },
              ]}
              rows={monitors || []}
            />
            <Pagination page={page} totalPages={meta?.totalPages} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
