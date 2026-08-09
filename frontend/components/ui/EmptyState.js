export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 px-6 text-center">
      {Icon && <Icon size={28} className="text-faint" strokeWidth={1.5} />}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="text-sm text-muted max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
