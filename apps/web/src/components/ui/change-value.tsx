import type { ReactNode } from "react";

const sign = (value: number) => (value > 0 ? "text-positive" : value < 0 ? "text-negative" : "text-text-secondary");

/** Colors financial text green/red by sign — gains/losses, score deltas, sector comparisons. */
export function ChangeValue({ value, children }: { value: number; children: ReactNode }) {
  return <span className={`tabular-nums font-medium ${sign(value)}`}>{children}</span>;
}

const badgeTone: Record<"positive" | "negative" | "neutral", string> = {
  positive: "bg-positive/15 text-positive",
  negative: "bg-negative/15 text-negative",
  neutral: "bg-surface-hover text-text-secondary",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "positive" | "negative" | "neutral";
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeTone[tone]}`}
    >
      {children}
    </span>
  );
}
