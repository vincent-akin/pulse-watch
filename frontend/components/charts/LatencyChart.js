"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function LatencyChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data || []} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: "var(--faint)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
        <YAxis tick={{ fill: "var(--faint)", fontSize: 11 }} axisLine={false} tickLine={false} width={48} unit="ms" />
        <Tooltip
          contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "var(--muted)" }}
        />
        <Line type="monotone" dataKey="avgResponseTime" stroke="var(--info)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
