import { messages } from "@boursea/shared";
import { getLocale } from "@/lib/i18n/locale";

export default async function ErrorPage() {
  const locale = await getLocale();
  const t = messages[locale];

  return (
    <div>
      <h1>{t.error.title}</h1>
      <p>{t.error.message}</p>
      <a href="/login">{t.error.backToLogin}</a>
    </div>
  );
}
