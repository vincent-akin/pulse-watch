"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function UptimeChart({ data }) {
  const points = (data || []).map((d) => ({ ...d, uptimePercentage: Number(d.uptimePercentage?.toFixed?.(2) ?? d.uptimePercentage) }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={points} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--healthy)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--healthy)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: "var(--faint)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: "var(--faint)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "var(--muted)" }}
        />
        <Area type="monotone" dataKey="uptimePercentage" stroke="var(--healthy)" fill="url(#uptimeGradient)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
