"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { CheckCircle2, Sparkles, ListChecks, Wrench } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import IncidentTimeline from "@/components/incidents/IncidentTimeline";
import { api } from "@/lib/apiClient";
import { formatDate, formatDuration } from "@/lib/format";

function ConfidenceBadge({ confidence }) {
  if (confidence === null || confidence === undefined) return null;
  const tone = confidence >= 70 ? "var(--healthy)" : confidence >= 40 ? "var(--degraded)" : "var(--unhealthy)";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
      style={{ color: tone, borderColor: `color-mix(in srgb, ${tone} 35%, transparent)`, background: `color-mix(in srgb, ${tone} 12%, transparent)` }}
    >
      {confidence}% confidence
    </span>
  );
}

export default function IncidentDetailPage() {
  const { id } = useParams();
  const [incident, setIncident] = useState(null);
  const [summary, setSummary] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get(`/incidents/${id}`).then(({ data }) => setIncident(data));
    api.get(`/incidents/${id}/summary`).then(({ data }) => setSummary(data));
    api.get(`/incidents/${id}/timeline`).then(({ data }) => setTimeline(data));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function acknowledge() {
    setBusy(true);
    try {
      const { data } = await api.post(`/incidents/${id}/acknowledge`);
      setIncident(data);
      toast.success("Incident acknowledged.");
      load();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  async function resolve() {
    if (!confirm("Manually resolve this incident?")) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/incidents/${id}/resolve`);
      setIncident(data);
      toast.success("Incident resolved.");
      load();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  if (!incident) return <PageSpinner />;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge status={incident.severity} />
          <Badge status={incident.status} />
        </div>
        {incident.status === "open" && (
          <div className="flex gap-2">
            {!incident.acknowledgedAt && <Button variant="secondary" size="sm" onClick={acknowledge} loading={busy}>Acknowledge</Button>}
            <Button size="sm" onClick={resolve} loading={busy}><CheckCircle2 size={14} /> Resolve manually</Button>
          </div>
        )}
      </div>

      <Card className="p-5 space-y-3">
        <Row label="Failure reason" value={incident.failureReason || "—"} />
        <Row label="Failure count" value={incident.failureCount} />
        <Row label="Started" value={formatDate(incident.startedAt)} />
        <Row label="Ended" value={incident.endedAt ? formatDate(incident.endedAt) : "Ongoing"} />
        <Row label="Duration" value={incident.duration ? formatDuration(incident.duration) : "—"} />
        <Row label="Resolved manually" value={incident.resolvedManually ? "Yes" : "No"} />
        <Row label="Acknowledged" value={incident.acknowledgedAt ? formatDate(incident.acknowledgedAt) : "Not yet"} />
      </Card>

      {/* AI Incident Intelligence — summary, root cause hypothesis, suggested fixes */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} className="text-accent" /> AI incident intelligence</h3>
          <ConfidenceBadge confidence={summary?.aiRootCause?.confidence} />
        </div>

        {summary?.generated ? (
          <>
            <p className="text-sm text-muted">{summary.aiSummary}</p>

            {summary.aiRootCause?.findings?.length > 0 && (
              <div>
                <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-faint">
                  <ListChecks size={13} /> Root cause findings
                </h4>
                <ul className="space-y-1">
                  {summary.aiRootCause.findings.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-faint" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.aiSuggestedFixes?.length > 0 && (
              <div>
                <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-faint">
                  <Wrench size={13} /> Suggested fixes
                </h4>
                <ul className="space-y-1.5">
                  {summary.aiSuggestedFixes.map((fix, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-healthy" />
                      {fix}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-faint">
            {incident.status === "open" ? "Generated automatically once the incident closes." : "Generating — check back shortly."}
          </p>
        )}
      </Card>

      {/* Incident Timeline — leading signal → open → notifications → acknowledge → close → AI analysis */}
      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold">Timeline</h3>
        <IncidentTimeline events={timeline?.events} />
      </Card>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}
