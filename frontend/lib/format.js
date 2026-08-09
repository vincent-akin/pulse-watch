export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatRelative(value) {
  if (!value) return "—";
  const diffMs = Date.now() - new Date(value).getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

export function formatDuration(ms) {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const min = sec / 60;
  if (min < 60) return `${min.toFixed(1)}m`;
  const hr = min / 60;
  return `${hr.toFixed(1)}h`;
}

export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

export const STATUS_COLORS = {
  healthy: "var(--healthy)",
  active: "var(--healthy)",
  valid: "var(--healthy)",
  operational: "var(--healthy)",
  sent: "var(--healthy)",
  paid: "var(--healthy)",
  degraded: "var(--degraded)",
  "expiring-soon": "var(--degraded)",
  pending: "var(--degraded)",
  paused: "var(--degraded)",
  draft: "var(--muted)",
  unhealthy: "var(--unhealthy)",
  expired: "var(--unhealthy)",
  failed: "var(--unhealthy)",
  open: "var(--unhealthy)",
  archived: "var(--faint)",
  closed: "var(--healthy)",
  unknown: "var(--muted)",
};
