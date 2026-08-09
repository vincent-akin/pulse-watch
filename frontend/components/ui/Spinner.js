export default function Spinner({ className = "" }) {
  return <div className={`h-5 w-5 rounded-full border-2 border-border border-t-accent animate-spin ${className}`} />;
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner />
    </div>
  );
}
