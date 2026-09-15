import Link from "next/link";
import { redirect } from "next/navigation";
import { messages } from "@trendus/shared";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { signOut } from "./actions";
import { SearchBox } from "./search-box";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = messages[locale];

  return (
    <div>
      <h1>{t.dashboard.title}</h1>
      <p>
        {t.dashboard.loggedInAs}: {claims.email}
      </p>
      <p>
        <Link href="/settings">{t.dashboard.settingsLink}</Link>
      </p>
      <SearchBox messages={t.search} />
      <form action={signOut}>
        <button type="submit">{t.dashboard.signOut}</button>
      </form>
    </div>
  );
}
