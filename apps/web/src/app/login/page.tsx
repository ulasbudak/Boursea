import { signIn, signUp } from "./actions";
import { SubmitButton } from "./submit-button";
import { SocialButtons } from "./social-buttons";

export default function LoginPage() {
  return (
    <div>
      <h1>Giriş Yap / Kayıt Ol</h1>
      <form>
        <label htmlFor="email">E-posta</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
        />
        <label htmlFor="password">Şifre</label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          minLength={6}
        />
        <SubmitButton formAction={signIn} pendingText="Giriş yapılıyor...">
          Giriş Yap
        </SubmitButton>
        <SubmitButton formAction={signUp} pendingText="Kayıt olunuyor...">
          Kayıt Ol
        </SubmitButton>
      </form>
      <SocialButtons />
    </div>
  );
}
