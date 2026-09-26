/**
 * Borocean logomark: three ascending candlesticks, opacity-graded for depth —
 * the app's own candlestick-chart language, and a quiet echo of its "three
 * views" positioning (rule-based score, AI fundamentals, AI technical read).
 * See docs/marketing/brand/ for the full asset set and usage guidelines.
 */
function BoroceanMark({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label="Borocean logomark"
      className="text-accent"
    >
      <line x1={28} y1={46} x2={28} y2={88} stroke="currentColor" strokeWidth={4} strokeLinecap="round" opacity={0.35} />
      <rect x={20} y={58} width={16} height={22} rx={6} fill="currentColor" opacity={0.35} />
      <line x1={58} y1={26} x2={58} y2={92} stroke="currentColor" strokeWidth={4.5} strokeLinecap="round" opacity={0.68} />
      <rect x={49} y={40} width={18} height={30} rx={7} fill="currentColor" opacity={0.68} />
      <line x1={90} y1={8} x2={90} y2={96} stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
      <rect x={80} y={24} width={20} height={38} rx={8} fill="currentColor" />
    </svg>
  );
}

export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const icon = size === "sm" ? 22 : 28;
  const text = size === "sm" ? "text-sm" : "text-base";

  return (
    <div className="flex items-center gap-2">
      <BoroceanMark size={icon} />
      <span className={`${text} font-semibold tracking-tight text-text-primary`}>Borocean</span>
    </div>
  );
}
