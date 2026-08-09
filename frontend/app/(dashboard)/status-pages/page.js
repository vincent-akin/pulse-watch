"use client";
import Link from "next/link";
import { Plus, MonitorSmartphone, ExternalLink } from "lucide-react";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import { useResource } from "@/lib/useResource";
import { useOrg } from "@/lib/OrgContext";
import { useRouter } from "next/navigation";

export default function StatusPagesPage() {
  const { currentOrgId } = useOrg();
  const router = useRouter();
  const { data: pages, loading } = useResource(currentOrgId ? "/status-pages" : null, { deps: [currentOrgId] });

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/status-pages/new"><Button size="sm"><Plus size={14} /> New status page</Button></Link>
      </div>

      <Card>
        {pages && pages.length === 0 ? (
          <EmptyState icon={MonitorSmartphone} title="No status pages yet" description="Publish a public page summarizing the health of selected monitors." />
        ) : (
          <Table
            onRowClick={(p) => router.push(`/status-pages/${p._id}`)}
            columns={[
              { key: "title", header: "Title" },
              { key: "slug", header: "URL", render: (p) => (
                <a href={`/status/${p.slug}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 font-mono text-xs text-accent hover:underline">
                  /status/{p.slug} <ExternalLink size={11} />
                </a>
              )},
              { key: "isPublic", header: "Visibility", render: (p) => <Badge status={p.isPublic ? "active" : "paused"}>{p.isPublic ? "Public" : "Private"}</Badge> },
              { key: "monitorIds", header: "Monitors", render: (p) => <span className="text-xs text-muted">{p.monitorIds?.length || 0}</span> },
            ]}
            rows={pages || []}
          />
        )}
      </Card>
    </div>
  );
}
