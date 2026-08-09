// Signature mark: an ECG/heartbeat trace — the one motif tying visual identity to "PulseWatch".
// Used small and sparingly (sidebar brand, loading states) rather than repeated throughout.
export default function PulseLogo({ size = 28, animated = true, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="15" stroke="var(--accent)" strokeOpacity="0.25" strokeWidth="1.5" />
      <path
        d="M3 16h5l2.5-7 4 14 3-10 2 3h9.5"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        style={animated ? { strokeDasharray: 60, strokeDashoffset: 0, animation: "pulse-line 2.4s ease-in-out infinite" } : undefined}
      />
    </svg>
  );
}

export function LiveDot({ className = "" }) {
  return (
    <span className={`relative inline-flex h-2 w-2 ${className}`}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent animate-pulse-dot" />
    </span>
  );
}

// Wide EKG-monitor-style sweeping trace — a continuous heartbeat waveform that scrolls left to right.
// This is the "big" pulse animation: used as a banner flourish (auth screen, dashboard header),
// not repeated throughout the UI, so it stays a moment rather than wallpaper.
export function PulseBanner({ className = "", height = 64 }) {
  const wave = "M0 32 L40 32 L52 32 L60 8 L70 56 L80 16 L88 32 L120 32 L132 32 L140 8 L150 56 L160 16 L168 32 L200 32";
  return (
    <svg
      viewBox="0 0 200 64"
      preserveAspectRatio="none"
      height={height}
      className={`w-full overflow-visible ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pulseBannerFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="12%" stopColor="var(--accent)" stopOpacity="0.9" />
          <stop offset="88%" stopColor="var(--accent)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={wave} fill="none" stroke="var(--border)" strokeWidth="1.5" opacity="0.5" />
      <path
        d={wave}
        fill="none"
        stroke="url(#pulseBannerFade)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        style={{ strokeDasharray: "22 78", animation: "pulse-sweep 3.2s linear infinite" }}
      />
    </svg>
  );
}
