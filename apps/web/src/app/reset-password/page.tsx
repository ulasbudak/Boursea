import Link from "next/link";
import { messages } from "@borocean/shared";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { AuthShell } from "@/components/auth/auth-shell";
import { Notice } from "@/components/auth/notice";
import { primaryButtonClass } from "@/components/auth/button-styles";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const locale = await getLocale();
  const t = messages[locale];

  return (
    <AuthShell title={t.auth.newPasswordTitle} subtitle={t.auth.newPasswordSubtitle}>
      {data?.claims ? (
        <ResetPasswordForm messages={t.auth} />
      ) : (
        // Reached without the session the emailed reset link creates (opened directly,
        // expired, or in another browser).
        <div className="flex flex-col gap-4">
          <Notice tone="error">{t.auth.errors.sessionMissing}</Notice>
          <Link href="/forgot-password" className={`${primaryButtonClass} text-center`}>
            {t.error.requestNewLink}
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
