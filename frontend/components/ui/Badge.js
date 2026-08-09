import clsx from "clsx";
import { STATUS_COLORS } from "@/lib/format";

export default function Badge({ status, children, className }) {
  const color = STATUS_COLORS[status] || "var(--muted)";
  return (
    <span
      className={clsx("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium capitalize", className)}
      style={{ color, borderColor: `color-mix(in srgb, ${color} 35%, transparent)`, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {children || status}
    </span>
  );
}
