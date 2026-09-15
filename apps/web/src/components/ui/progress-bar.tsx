export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const tone = pct >= 70 ? "bg-positive" : pct >= 40 ? "bg-warning" : "bg-negative";

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
      <div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}
