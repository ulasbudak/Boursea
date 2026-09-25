/**
 * Boursea logomark: a wave dipping into a decisive uptrend breakout —
 * "-sea" (dalga) resolving into a clear market direction. See
 * docs/marketing/brand/ for the full asset set and usage guidelines.
 */
function BourseaMark({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label="Boursea logomark"
      className="text-accent"
    >
      <path
        d="M15,64 Q33,96 53,68 L86,22"
        fill="none"
        stroke="currentColor"
        strokeWidth={11.5}
        strokeLinecap="butt"
        strokeLinejoin="round"
      />
      <polygon points="98.83,4.11 93.32,27.25 78.68,16.75" fill="currentColor" />
      <circle cx={15} cy={64} r={7} fill="currentColor" />
    </svg>
  );
}

export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const icon = size === "sm" ? 22 : 28;
  const text = size === "sm" ? "text-sm" : "text-base";

  return (
    <div className="flex items-center gap-2">
      <BourseaMark size={icon} />
      <span className={`${text} font-semibold tracking-tight text-text-primary`}>Boursea</span>
    </div>
  );
}
