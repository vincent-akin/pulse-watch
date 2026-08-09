import clsx from "clsx";

export default function Card({ className, children, ...props }) {
  return (
    <div className={clsx("rounded-lg border border-border bg-surface", className)} {...props}>
      {children}
    </div>
  );
}
