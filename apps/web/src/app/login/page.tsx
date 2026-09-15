import { messages } from "@trendus/shared";
import { getLocale } from "@/lib/i18n/locale";
import { signIn, signUp } from "./actions";
import { SubmitButton } from "./submit-button";
import { SocialButtons } from "./social-buttons";

export default async function LoginPage() {
  const locale = await getLocale();
  const t = messages[locale];

  return (
    <div>
      <h1>{t.auth.title}</h1>
      <form>
        <label htmlFor="email">{t.auth.email}</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
        />
        <label htmlFor="password">{t.auth.password}</label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          minLength={6}
        />
        <SubmitButton formAction={signIn} pendingText={t.auth.loggingIn}>
          {t.auth.login}
        </SubmitButton>
        <SubmitButton formAction={signUp} pendingText={t.auth.signingUp}>
          {t.auth.signup}
        </SubmitButton>
      </form>
      <SocialButtons messages={t.auth} />
    </div>
  );
}
