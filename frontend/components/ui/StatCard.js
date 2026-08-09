import Card from "./Card";

export default function StatCard({ label, value, hint, icon: Icon, tone }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold" style={tone ? { color: tone } : undefined}>{value}</p>
          {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
        </div>
        {Icon && <Icon size={18} className="text-faint" strokeWidth={1.75} />}
      </div>
    </Card>
  );
}
