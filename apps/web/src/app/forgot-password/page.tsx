import { messages } from "@boursea/shared";
import { getLocale } from "@/lib/i18n/locale";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  const locale = await getLocale();
  const t = messages[locale];

  return (
    <AuthShell title={t.auth.forgotPasswordTitle} subtitle={t.auth.forgotPasswordSubtitle}>
      <ForgotPasswordForm messages={t.auth} />
    </AuthShell>
  );
}
