import PulseLogo, { PulseBanner } from "@/components/ui/PulseLogo";

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-2 flex flex-col items-center gap-2">
          <PulseLogo size={36} />
          <span className="font-display text-xl font-semibold">PulseWatch</span>
          <p className="text-sm text-muted">Monitoring that validates the response, not just the ping.</p>
        </div>
        <PulseBanner className="mb-6" height={48} />
        {children}
      </div>
    </div>
  );
}
