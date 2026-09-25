import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";

/** Centered card layout shared by the login, password reset and auth error pages. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />

      <Card className="relative w-full max-w-sm shadow-2xl shadow-black/40">
        <div className="mb-6 flex flex-col items-center gap-4 text-center">
          <Logo />
          <div>
            <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-text-tertiary">{subtitle}</p>}
          </div>
        </div>
        {children}
      </Card>
    </div>
  );
}
