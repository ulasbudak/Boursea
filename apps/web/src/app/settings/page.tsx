import { redirect } from "next/navigation";
import { messages } from "@boursea/shared";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { NotificationSettings } from "./notification-settings";
import { InterestSectors } from "./interest-sectors";
import { BillingCard } from "./billing-card";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = messages[locale];
  const currentSectors: string[] = Array.isArray(data.claims.user_metadata?.interest_sectors)
    ? data.claims.user_metadata.interest_sectors
    : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <PageHeader backHref="/dashboard" backLabel={t.settings.backToDashboard} title={t.settings.title} />

      <Card>
        <CardHeader>
          <CardTitle>{t.billing.title}</CardTitle>
        </CardHeader>
        <BillingCard messages={t.billing} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.language}</CardTitle>
        </CardHeader>
        <LanguageSwitcher currentLocale={locale} messages={t.settings} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.theme}</CardTitle>
        </CardHeader>
        <ThemeToggle messages={t.settings} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.notificationsTitle}</CardTitle>
        </CardHeader>
        <NotificationSettings messages={t.settings} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.personalization.interestSectorsTitle}</CardTitle>
        </CardHeader>
        <InterestSectors currentSectors={currentSectors} locale={locale} messages={t.personalization} />
      </Card>
    </div>
  );
}
