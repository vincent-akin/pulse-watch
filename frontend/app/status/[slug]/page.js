"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import PulseLogo, { PulseBanner, LiveDot } from "@/components/ui/PulseLogo";
import Badge from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { API_BASE_URL } from "@/lib/apiClient";
import { formatDate } from "@/lib/format";

// Public, unauthenticated view — fetched directly without the authenticated api client,
// since this page must work for anonymous visitors (API Spec: GET /status-pages/:slug, public).
export default function PublicStatusPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/status-pages/${slug}`)
      .then((res) => res.json())
      .then((body) => { if (body.success) setPage(body.data); else setError(true); })
      .catch(() => setError(true));
  }, [slug]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-center">
        <p className="text-muted">Status page not found.</p>
      </div>
    );
  }
  if (!page) return <PageSpinner />;

  const operational = page.overallStatus === "operational";

  return (
    <div className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-center gap-2">
          <PulseLogo size={28} />
          <h1 className="font-display text-xl font-semibold">{page.title}</h1>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted">
            <LiveDot /> Live
          </span>
        </div>
        <PulseBanner height={40} />

        <div className={`flex items-center gap-3 rounded-lg border p-4 ${operational ? "border-healthy/30 bg-healthy/10" : "border-degraded/30 bg-degraded/10"}`}>
          {operational ? <CheckCircle2 className="text-healthy" size={22} /> : <AlertTriangle className="text-degraded" size={22} />}
          <p className="text-sm font-medium">{operational ? "All systems operational" : "Some systems are experiencing issues"}</p>
        </div>

        <div className="space-y-2">
          {page.monitors.map((m) => (
            <div key={m.name} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
              <div>
                <p className="text-sm font-medium">{m.name}</p>
                {m.openIncident && <p className="mt-0.5 text-xs text-unhealthy">{m.openIncident.failureReason}</p>}
              </div>
              <Badge status={m.status} />
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-faint">Last updated {formatDate(page.generatedAt)} · Powered by PulseWatch</p>
      </div>
    </div>
  );
}
