import { messages } from "@borocean/shared";
import { getLocale } from "@/lib/i18n/locale";
import { AuthShell } from "@/components/auth/auth-shell";
import { Notice } from "@/components/auth/notice";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const locale = await getLocale();
  const t = messages[locale];

  const noticeText =
    notice === "email_confirmed"
      ? t.auth.emailConfirmed
      : notice === "password_updated"
        ? t.auth.passwordUpdated
        : null;

  return (
    <AuthShell title={t.auth.title} subtitle={t.auth.subtitle}>
      {noticeText && (
        <div className="mb-4">
          <Notice tone="success">{noticeText}</Notice>
        </div>
      )}

      <LoginForm messages={t.auth} />
    </AuthShell>
  );
}
