import { TrendingUp } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const icon = size === "sm" ? 16 : 20;
  const text = size === "sm" ? "text-sm" : "text-base";

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex ${box} items-center justify-center rounded-md bg-accent text-accent-text shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_4px_12px_-2px_rgba(59,130,246,0.45)]`}
      >
        <TrendingUp size={icon} strokeWidth={2.5} />
      </div>
      <span className={`${text} font-semibold tracking-tight text-text-primary`}>Boursea</span>
    </div>
  );
}
