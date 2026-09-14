import Link from "next/link";
import styles from "./page.module.css";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Trendus</h1>
        <Link href={isAuthenticated ? "/dashboard" : "/login"}>
          {isAuthenticated ? "Panele git" : "Giriş Yap / Kayıt Ol"}
        </Link>
      </main>
    </div>
  );
}
