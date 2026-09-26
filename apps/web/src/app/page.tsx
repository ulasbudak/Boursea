import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { messages } from "@borocean/shared";
import { Logo } from "@/components/ui/logo";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);
  const locale = await getLocale();
  const t = messages[locale];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <Logo size="md" />
        <p className="text-sm text-text-tertiary">{t.auth.subtitle}</p>
        <Link
          href={isAuthenticated ? "/dashboard" : "/login"}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-text shadow-[0_4px_14px_-4px_rgba(59,130,246,0.55)] transition-all hover:opacity-90 active:scale-[0.98]"
        >
          {isAuthenticated ? t.home.goToDashboard : t.home.loginOrSignup}
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
