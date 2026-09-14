import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    redirect("/login");
  }

  return (
    <div>
      <h1>Panel</h1>
      <p>Giriş yapıldı: {claims.email}</p>
      <form action={signOut}>
        <button type="submit">Çıkış Yap</button>
      </form>
    </div>
  );
}
