import Link from "next/link";
import styles from "./page.module.css";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { messages } from "@trendus/shared";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);
  const locale = await getLocale();
  const t = messages[locale];

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>{t.common.appName}</h1>
        <Link href={isAuthenticated ? "/dashboard" : "/login"}>
          {isAuthenticated ? t.home.goToDashboard : t.home.loginOrSignup}
        </Link>
      </main>
    </div>
  );
}
