"use client";
import {
  Activity, AlertTriangle, BellRing, BellOff, CheckCheck, CheckCircle2, Sparkles,
} from "lucide-react";
import { formatDate } from "@/lib/format";

const EVENT_STYLE = {
  healthcheck: { icon: Activity, color: "var(--degraded)" },
  "incident.opened": { icon: AlertTriangle, color: "var(--unhealthy)" },
  "notification.sent": { icon: BellRing, color: "var(--info)" },
  "notification.failed": { icon: BellOff, color: "var(--unhealthy)" },
  "incident.acknowledged": { icon: CheckCheck, color: "var(--accent)" },
  "incident.closed": { icon: CheckCircle2, color: "var(--healthy)" },
  "ai.analysis": { icon: Sparkles, color: "var(--accent)" },
};

// One page. Everything. — a single chronological view of an incident's lifecycle, built from
// the leading health-check signal, the open/close/acknowledge events, every notification
// delivery attempt, and the AI analysis, instead of piecing it together from four different tabs.
export default function IncidentTimeline({ events }) {
  if (!events || events.length === 0) {
    return <p className="text-sm text-faint">No timeline events recorded yet.</p>;
  }

  return (
    <ol className="relative space-y-5 border-l border-border pl-6">
      {events.map((event, i) => {
        const style = EVENT_STYLE[event.type] || { icon: Activity, color: "var(--muted)" };
        const Icon = style.icon;
        return (
          <li key={`${event.type}-${event.timestamp}-${i}`} className="relative">
            <span
              className="absolute -left-[29px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-background"
              style={{ background: `color-mix(in srgb, ${style.color} 18%, var(--surface))` }}
            >
              <Icon size={12} style={{ color: style.color }} />
            </span>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">{event.label}</p>
              <span className="font-mono text-xs text-faint">{formatDate(event.timestamp)}</span>
            </div>
            {event.detail && <p className="mt-0.5 text-sm text-muted">{event.detail}</p>}
          </li>
        );
      })}
    </ol>
  );
}
