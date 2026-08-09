"use client";
import { Globe2 } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { formatRelative, formatDuration } from "@/lib/format";

// Multi-region status grid — "London ✅, Frankfurt ❌, Singapore ✅" at a glance, so a partial
// outage (one region down, the rest fine) reads instantly instead of blending into one status.
export default function RegionStatusGrid({ regions }) {
  if (!regions || regions.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {regions.map((r) => (
        <div key={r.region} className="rounded-lg border border-border bg-surface p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <Globe2 size={12} /> {r.region}
            </span>
            <Badge status={r.status} />
          </div>
          <p className="mt-2 font-mono text-sm">
            {r.responseTime !== null ? formatDuration(r.responseTime) : "\u2014"}
          </p>
          <p className="text-xs text-faint">
            {r.lastCheckedAt ? `checked ${formatRelative(r.lastCheckedAt)}` : "not checked yet"}
          </p>
        </div>
      ))}
    </div>
  );
}
