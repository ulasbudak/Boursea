import { redirect } from "next/navigation";
import { messages } from "@trendus/shared";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { NotificationSettings } from "./notification-settings";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = messages[locale];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <PageHeader backHref="/dashboard" backLabel={t.settings.backToDashboard} title={t.settings.title} />

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
    </div>
  );
}
