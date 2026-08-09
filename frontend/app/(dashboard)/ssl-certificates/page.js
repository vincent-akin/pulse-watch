"use client";
import toast from "react-hot-toast";
import { RefreshCw, ShieldCheck } from "lucide-react";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import { useResource } from "@/lib/useResource";
import { useOrg } from "@/lib/OrgContext";
import { api } from "@/lib/apiClient";
import { formatDate } from "@/lib/format";

export default function SslCertificatesPage() {
  const { currentOrgId } = useOrg();
  const { data: certs, loading, refetch } = useResource(currentOrgId ? "/ssl-certificates" : null, { params: { limit: 100 }, deps: [currentOrgId] });

  async function recheck(id) {
    try {
      await api.post(`/ssl-certificates/${id}/recheck`);
      toast.success("Recheck queued.");
      setTimeout(refetch, 1500);
    } catch (err) { toast.error(err.message); }
  }

  if (loading) return <PageSpinner />;

  return (
    <Card>
      {certs && certs.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No SSL certificates tracked" description="Certificates are tracked automatically for every HTTPS monitor." />
      ) : (
        <Table
          columns={[
            { key: "domain", header: "Domain", className: "font-mono text-sm" },
            { key: "issuer", header: "Issuer", className: "text-sm" },
            { key: "status", header: "Status", render: (c) => <Badge status={c.status} /> },
            { key: "validTo", header: "Expires", render: (c) => <span className="font-mono text-xs">{formatDate(c.validTo)}</span> },
            { key: "daysUntilExpiry", header: "Days left", className: "font-mono text-xs" },
            { key: "lastCheckedAt", header: "Last checked", render: (c) => <span className="text-xs text-muted">{formatDate(c.lastCheckedAt)}</span> },
            { key: "actions", header: "", className: "text-right", render: (c) => (
              <button onClick={() => recheck(c._id)} className="text-faint hover:text-accent"><RefreshCw size={14} /></button>
            )},
          ]}
          rows={certs || []}
        />
      )}
    </Card>
  );
}
