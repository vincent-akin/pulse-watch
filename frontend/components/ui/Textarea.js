"use client";
import clsx from "clsx";

export default function Textarea({ label, error, className, id, ...props }) {
  const inputId = id || props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={inputId} className="text-xs font-medium text-muted">{label}</label>}
      <textarea
        id={inputId}
        className={clsx(
          "rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-faint font-mono",
          "focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent",
          error && "border-unhealthy",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-unhealthy">{error}</span>}
    </div>
  );
}
