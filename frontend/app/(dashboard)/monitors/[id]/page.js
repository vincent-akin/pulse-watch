"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Pause, Play, Zap, Trash2, Pencil } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";
import StatCard from "@/components/ui/StatCard";
import { PageSpinner } from "@/components/ui/Spinner";
import LatencyChart from "@/components/charts/LatencyChart";
import MonitorForm, { monitorToFormState } from "@/components/monitors/MonitorForm";
import RegionStatusGrid from "@/components/monitors/RegionStatusGrid";
import { useResource } from "@/lib/useResource";
import { useOrg } from "@/lib/OrgContext";
import { useSocket } from "@/lib/useSocket";
import { api } from "@/lib/apiClient";
import { formatDate, formatDuration } from "@/lib/format";

export default function MonitorDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { currentOrgId } = useOrg();
  const [monitor, setMonitor] = useState(null);
  const [etag, setEtag] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [testing, setTesting] = useState(false);
  const [regionFilter, setRegionFilter] = useState("");

  const loadMonitor = useCallback(() => {
    api.get(`/monitors/${id}`).then(({ data, etag: tag }) => { setMonitor(data); setEtag(tag); });
  }, [id]);

  useEffect(() => { loadMonitor(); }, [loadMonitor]);

  const { data: healthChecks, refetch: refetchChecks } = useResource(`/monitors/${id}/health-checks`, {
    params: { limit: 50, region: regionFilter || undefined },
    deps: [id, regionFilter],
  });
  const { data: incidents } = useResource(`/monitors/${id}/incidents`, { params: { limit: 10 }, deps: [id] });
  const { data: regionStatus, refetch: refetchRegions } = useResource(`/monitors/${id}/regions`, { deps: [id] });

  useSocket(currentOrgId, {
    "monitor.updated": (m) => { if (m._id === id) setMonitor(m); },
    "healthcheck.completed": (hc) => { if (hc.monitorId === id) { refetchChecks(); refetchRegions(); } },
  });

  async function toggleEnabled() {
    try {
      const { data } = await api.post(`/monitors/${id}/${monitor.enabled ? "pause" : "resume"}`);
      setMonitor(data);
      toast.success(monitor.enabled ? "Monitor paused." : "Monitor resumed.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function runTest() {
    setTesting(true);
    try {
      const { data } = await api.post(`/monitors/${id}/test`);
      setTestResults(data); // array — one result per configured region
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTesting(false);
    }
  }

  async function onDelete() {
    if (!confirm(`Delete monitor "${monitor.name}"?`)) return;
    await api.delete(`/monitors/${id}`);
    toast.success("Monitor deleted.");
    router.push("/monitors");
  }

  async function onEdit(payload) {
    const { data, etag: newTag } = await api.patch(`/monitors/${id}`, payload, { ifMatch: etag });
    setMonitor(data);
    setEtag(newTag);
    setEditOpen(false);
    toast.success("Monitor updated.");
    refetchRegions();
  }

  if (!monitor) return <PageSpinner />;

  const latencySeries = [...(healthChecks || [])].reverse().map((h) => ({ date: new Date(h.completedAt).toLocaleTimeString(), avgResponseTime: h.responseTime }));
  const avgResponseTime = healthChecks?.length ? Math.round(healthChecks.reduce((s, h) => s + h.responseTime, 0) / healthChecks.length) : null;
  const regions = monitor.region || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold">{monitor.name}</h2>
            <Badge status={monitor.status} />
          </div>
          <p className="mt-1 font-mono text-sm text-muted">{monitor.method} {monitor.url}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={runTest} loading={testing}><Zap size={14} /> Test all regions</Button>
          <Button variant="secondary" size="sm" onClick={toggleEnabled}>
            {monitor.enabled ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}><Pencil size={14} /> Edit</Button>
          <Button variant="danger" size="sm" onClick={onDelete}><Trash2 size={14} /> Delete</Button>
        </div>
      </div>

      {testResults && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Test results</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {testResults.map((r) => (
              <div key={r.region} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">{r.region}</span>
                  <Badge status={r.validationPassed ? "healthy" : "unhealthy"}>{r.validationPassed ? "Passed" : "Failed"}</Badge>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-xs text-muted">
                  <span>Status: {r.statusCode ?? "\u2014"}</span>
                  <span>Response: {formatDuration(r.responseTime)}</span>
                  <span>DNS: {formatDuration(r.dnsLookup)}</span>
                  <span>TTFB: {formatDuration(r.ttfb)}</span>
                </div>
                {r.failureReason && <p className="mt-2 text-xs text-unhealthy">{r.failureReason}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Interval" value={`${monitor.interval}s`} />
        <StatCard label="Timeout" value={`${monitor.timeout}ms`} />
        <StatCard label="Avg response (last 50)" value={avgResponseTime !== null ? `${avgResponseTime}ms` : "—"} />
        <StatCard label="Environment" value={monitor.environment} />
      </div>

      {/* Multi-region Monitoring — each configured region runs its own independent check schedule */}
      {regions.length > 1 && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Regions</h3>
          <RegionStatusGrid regions={regionStatus} />
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent response time</h3>
          {regions.length > 1 && (
            <Select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="w-40">
              <option value="">All regions</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          )}
        </div>
        <LatencyChart data={latencySeries} />
      </Card>

      <Card>
        <div className="border-b border-border px-4 py-3"><h3 className="text-sm font-semibold">Recent health checks</h3></div>
        <Table
          columns={[
            { key: "completedAt", header: "Time", render: (h) => <span className="font-mono text-xs">{formatDate(h.completedAt)}</span> },
            { key: "status", header: "Status", render: (h) => <Badge status={h.status} /> },
            { key: "statusCode", header: "Code", className: "font-mono text-xs" },
            { key: "responseTime", header: "Response time", render: (h) => <span className="font-mono text-xs">{formatDuration(h.responseTime)}</span> },
            { key: "region", header: "Region", className: "text-xs text-muted" },
            { key: "failureReason", header: "Notes", className: "text-xs text-unhealthy max-w-xs truncate" },
          ]}
          rows={healthChecks || []}
          emptyMessage="No health checks recorded yet."
        />
      </Card>

      <Card>
        <div className="border-b border-border px-4 py-3"><h3 className="text-sm font-semibold">Recent incidents</h3></div>
        <Table
          onRowClick={(i) => router.push(`/incidents/${i._id}`)}
          columns={[
            { key: "severity", header: "Severity", render: (i) => <Badge status={i.severity} /> },
            { key: "status", header: "Status", render: (i) => <Badge status={i.status} /> },
            { key: "startedAt", header: "Started", render: (i) => <span className="font-mono text-xs">{formatDate(i.startedAt)}</span> },
            { key: "failureReason", header: "Reason", className: "text-xs text-muted max-w-xs truncate" },
          ]}
          rows={incidents || []}
          emptyMessage="No incidents for this monitor."
        />
      </Card>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit monitor" size="lg">
        <MonitorForm initial={monitorToFormState(monitor)} onSubmit={onEdit} submitLabel="Save changes" />
      </Modal>
    </div>
  );
}
