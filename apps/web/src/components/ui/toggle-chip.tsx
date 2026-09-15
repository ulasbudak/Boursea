import type { ButtonHTMLAttributes } from "react";

/** Pill-shaped pressable chip — chart type/timeframe/indicator toggles, tab bars. */
export function ToggleChip({
  active,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-border-default bg-surface-elevated text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      } ${className}`}
      {...props}
    />
  );
}
