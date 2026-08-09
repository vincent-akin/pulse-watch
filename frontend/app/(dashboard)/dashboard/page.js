"use client";
import Link from "next/link";
import { Activity, AlertTriangle, ShieldCheck, Gauge } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/ui/StatCard";
import { PageSpinner } from "@/components/ui/Spinner";
import UptimeChart from "@/components/charts/UptimeChart";
import LatencyChart from "@/components/charts/LatencyChart";
import { useResource } from "@/lib/useResource";
import { useOrg } from "@/lib/OrgContext";
import { useSocket } from "@/lib/useSocket";
import { formatRelative } from "@/lib/format";

export default function DashboardPage() {
  const { currentOrgId } = useOrg();
  const { data: overview, loading: l1, refetch: refetchOverview } = useResource(currentOrgId ? "/analytics/overview" : null, { deps: [currentOrgId] });
  const { data: uptime, loading: l2 } = useResource(currentOrgId ? "/analytics/uptime" : null, { deps: [currentOrgId] });
  const { data: latency, loading: l3 } = useResource(currentOrgId ? "/analytics/latency" : null, { deps: [currentOrgId] });
  const { data: incidents } = useResource(currentOrgId ? "/incidents" : null, { params: { status: "open", limit: 5 }, deps: [currentOrgId] });

  useSocket(currentOrgId, {
    "incident.opened": () => refetchOverview(),
    "incident.closed": () => refetchOverview(),
    "healthcheck.completed": () => {},
  });

  if (l1 || l2 || l3) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Active Monitors" value={overview?.activeMonitors ?? 0} hint={`${overview?.totalMonitors ?? 0} total`} icon={Activity} />
        <StatCard label="Uptime (7d)" value={`${overview?.uptimePercentage ?? 100}%`} icon={Gauge} tone="var(--healthy)" />
        <StatCard label="Open Incidents" value={overview?.openIncidents ?? 0} icon={AlertTriangle} tone={overview?.openIncidents ? "var(--unhealthy)" : undefined} />
        <StatCard label="Checks (7d)" value={overview?.checksInRange ?? 0} icon={ShieldCheck} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Uptime, last 7 days</h3>
          <UptimeChart data={uptime?.daily} />
        </Card>
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Average latency, last 7 days</h3>
          <LatencyChart data={latency?.daily} />
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Open incidents</h3>
          <Link href="/incidents" className="text-xs text-accent hover:underline">View all</Link>
        </div>
        {incidents && incidents.length > 0 ? (
          <ul className="divide-y divide-border">
            {incidents.map((incident) => (
              <li key={incident._id}>
                <Link href={`/incidents/${incident._id}`} className="flex items-center justify-between px-4 py-3 hover:bg-surface-elevated">
                  <div>
                    <p className="text-sm font-medium">{incident.failureReason || "Monitor failing"}</p>
                    <p className="text-xs text-muted">Started {formatRelative(incident.startedAt)}</p>
                  </div>
                  <Badge status={incident.severity} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-muted">No open incidents. Everything&apos;s healthy.</p>
        )}
      </Card>
    </div>
  );
}
