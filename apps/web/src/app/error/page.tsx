import { messages } from "@boursea/shared";
import { getLocale } from "@/lib/i18n/locale";
import { AuthShell } from "@/components/auth/auth-shell";
import { ErrorDetails, type ErrorVariant } from "./error-details";

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const locale = await getLocale();
  const t = messages[locale];

  const variants: Record<string, ErrorVariant> = {
    generic: { title: t.error.title, message: t.error.message },
    link_expired: { title: t.error.linkExpiredTitle, message: t.error.linkExpiredMessage },
    other_browser: { title: t.error.otherBrowserTitle, message: t.error.otherBrowserMessage },
  };

  return (
    <AuthShell title={t.error.title}>
      <ErrorDetails
        variants={variants}
        initialReason={reason && reason in variants ? reason : "generic"}
        backToLogin={t.error.backToLogin}
        requestNewLink={t.error.requestNewLink}
      />
    </AuthShell>
  );
}
