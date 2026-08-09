"use client";
import clsx from "clsx";

const VARIANTS = {
  primary: "bg-accent text-background hover:bg-accent-hover",
  secondary: "bg-surface-elevated text-foreground border border-border hover:border-faint",
  ghost: "text-muted hover:text-foreground hover:bg-surface-elevated",
  danger: "bg-unhealthy/10 text-unhealthy border border-unhealthy/30 hover:bg-unhealthy/20",
};

const SIZES = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

export default function Button({ variant = "primary", size = "md", className, disabled, loading, children, ...props }) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />}
      {children}
    </button>
  );
}
