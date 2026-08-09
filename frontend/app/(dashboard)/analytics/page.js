"use client";
import Card from "@/components/ui/Card";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import UptimeChart from "@/components/charts/UptimeChart";
import LatencyChart from "@/components/charts/LatencyChart";
import { useResource } from "@/lib/useResource";
import { useOrg } from "@/lib/OrgContext";
import { formatDuration } from "@/lib/format";

export default function AnalyticsPage() {
  const { currentOrgId } = useOrg();
  const { data: overview, loading: l1 } = useResource(currentOrgId ? "/analytics/overview" : null, { deps: [currentOrgId] });
  const { data: uptime, loading: l2 } = useResource(currentOrgId ? "/analytics/uptime" : null, { deps: [currentOrgId] });
  const { data: latency, loading: l3 } = useResource(currentOrgId ? "/analytics/latency" : null, { deps: [currentOrgId] });
  const { data: incidents, loading: l4 } = useResource(currentOrgId ? "/analytics/incidents" : null, { deps: [currentOrgId] });

  if (l1 || l2 || l3 || l4) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Uptime" value={`${overview?.uptimePercentage ?? 100}%`} tone="var(--healthy)" />
        <StatCard label="Total incidents" value={incidents?.total ?? 0} />
        <StatCard label="Mean time to resolution" value={incidents?.meanTimeToResolutionMs ? formatDuration(incidents.meanTimeToResolutionMs) : "—"} />
        <StatCard label="Checks in range" value={overview?.checksInRange ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4"><h3 className="mb-2 text-sm font-semibold">Uptime</h3><UptimeChart data={uptime?.daily} /></Card>
        <Card className="p-4"><h3 className="mb-2 text-sm font-semibold">Latency</h3><LatencyChart data={latency?.daily} /></Card>
      </div>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Incidents by severity</h3>
        <div className="flex flex-wrap gap-3">
          {(incidents?.bySeverity || []).map((s) => (
            <div key={s.severity} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
              <Badge status={s.severity} />
              <span className="font-mono text-sm">{s.count}</span>
            </div>
          ))}
          {(!incidents?.bySeverity || incidents.bySeverity.length === 0) && <p className="text-sm text-muted">No incidents in this range.</p>}
        </div>
      </Card>
    </div>
  );
}
