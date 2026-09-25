import type { ReactNode } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

const tones = {
  error: {
    className: "border-negative/30 bg-negative/10 text-negative",
    icon: <CircleAlert size={16} className="mt-0.5 shrink-0" />,
    role: "alert",
  },
  success: {
    className: "border-positive/30 bg-positive/10 text-positive",
    icon: <CircleCheck size={16} className="mt-0.5 shrink-0" />,
    role: "status",
  },
} as const;

export function Notice({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  const { className, icon, role } = tones[tone];
  return (
    <div role={role} className={`flex gap-2 rounded-md border px-3 py-2 text-sm ${className}`}>
      {icon}
      <div>{children}</div>
    </div>
  );
}
