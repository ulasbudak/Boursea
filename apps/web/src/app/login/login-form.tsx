"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Lock, Mail } from "lucide-react";
import type { Messages } from "@borocean/shared";
import { Field, IconInput, Label } from "@/components/ui/input";
import {
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/auth/button-styles";
import { Notice } from "@/components/auth/notice";
import { authenticate, type AuthFormState } from "./actions";
import { SocialButtons } from "./social-buttons";
import { SubmitButton } from "./submit-button";

export function LoginForm({ messages }: { messages: Messages["auth"] }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    authenticate,
    {
      email: "",
    },
  );

  if (state.checkEmail) {
    return (
      <div className="flex flex-col gap-4">
        <Notice tone="success">
          <p className="font-medium">{messages.checkEmailTitle}</p>
          <p className="mt-1">
            {messages.checkEmailBody.replace("{email}", state.email)}
          </p>
        </Notice>
        <p className="text-xs text-text-tertiary">{messages.checkEmailHint}</p>
        {/* A plain anchor, not <Link>: this is already /login, and a client-side navigation
            would keep the action state (and this screen) instead of showing the form again. */}
        <a href="/login" className={`${secondaryButtonClass} text-center`}>
          {messages.backToLogin}
        </a>
      </div>
    );
  }

  return (
    <>
      <form action={formAction} className="flex flex-col gap-4">
        {state.error && (
          <Notice tone="error">{messages.errors[state.error]}</Notice>
        )}
        <Field>
          <Label htmlFor="email">{messages.email}</Label>
          <IconInput
            icon={<Mail size={16} />}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            defaultValue={state.email}
            required
          />
        </Field>
        <Field>
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="password" className="mb-0">
              {messages.password}
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-text-tertiary transition-colors hover:text-accent"
            >
              {messages.forgotPassword}
            </Link>
          </div>
          <IconInput
            icon={<Lock size={16} />}
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            minLength={6}
          />
        </Field>
        <div className="mt-2 flex flex-col gap-2">
          <SubmitButton
            name="intent"
            value="signin"
            pendingText={messages.loggingIn}
            className={primaryButtonClass}
          >
            {messages.login}
          </SubmitButton>
          <SubmitButton
            name="intent"
            value="signup"
            pendingText={messages.signingUp}
            className={secondaryButtonClass}
          >
            {messages.signup}
          </SubmitButton>
        </div>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-text-tertiary">
        <span className="h-px flex-1 bg-border-subtle" />
        {messages.orDivider}
        <span className="h-px flex-1 bg-border-subtle" />
      </div>

      <SocialButtons messages={messages} />
    </>
  );
}
