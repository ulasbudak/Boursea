import { Lock, Mail } from "lucide-react";
import { messages } from "@boursea/shared";
import { getLocale } from "@/lib/i18n/locale";
import { Card } from "@/components/ui/card";
import { Field, IconInput, Label } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { signIn, signUp } from "./actions";
import { SubmitButton } from "./submit-button";
import { SocialButtons } from "./social-buttons";

export default async function LoginPage() {
  const locale = await getLocale();
  const t = messages[locale];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />

      <Card className="relative w-full max-w-sm shadow-2xl shadow-black/40">
        <div className="mb-6 flex flex-col items-center gap-4 text-center">
          <Logo />
          <div>
            <h1 className="text-lg font-semibold text-text-primary">{t.auth.title}</h1>
            <p className="mt-1 text-sm text-text-tertiary">{t.auth.subtitle}</p>
          </div>
        </div>

        <form className="flex flex-col gap-4">
          <Field>
            <Label htmlFor="email">{t.auth.email}</Label>
            <IconInput
              icon={<Mail size={16} />}
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
            />
          </Field>
          <Field>
            <Label htmlFor="password">{t.auth.password}</Label>
            <IconInput
              icon={<Lock size={16} />}
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </Field>
          <div className="mt-2 flex flex-col gap-2">
            <SubmitButton
              formAction={signIn}
              pendingText={t.auth.loggingIn}
              className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-text shadow-[0_4px_14px_-4px_rgba(59,130,246,0.55)] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {t.auth.login}
            </SubmitButton>
            <SubmitButton
              formAction={signUp}
              pendingText={t.auth.signingUp}
              className="w-full rounded-md border border-border-default bg-surface-elevated px-4 py-2.5 text-sm font-medium text-text-primary transition-all hover:bg-surface-hover active:scale-[0.98] disabled:opacity-50"
            >
              {t.auth.signup}
            </SubmitButton>
          </div>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-text-tertiary">
          <span className="h-px flex-1 bg-border-subtle" />
          {t.auth.orDivider}
          <span className="h-px flex-1 bg-border-subtle" />
        </div>

        <SocialButtons messages={t.auth} />
      </Card>
    </div>
  );
}
