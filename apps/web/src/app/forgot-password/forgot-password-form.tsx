"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import type { Messages } from "@borocean/shared";
import { Field, IconInput, Label } from "@/components/ui/input";
import { Notice } from "@/components/auth/notice";
import { SubmitButton } from "../login/submit-button";
import { primaryButtonClass } from "@/components/auth/button-styles";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";

export function ForgotPasswordForm({ messages }: { messages: Messages["auth"] }) {
  const [state, formAction] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordReset,
    { email: "" }
  );

  return (
    <div className="flex flex-col gap-4">
      {state.sent ? (
        <Notice tone="success">
          <p className="font-medium">{messages.resetLinkSentTitle}</p>
          <p className="mt-1">{messages.resetLinkSentBody}</p>
        </Notice>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          {state.error && <Notice tone="error">{messages.errors[state.error]}</Notice>}
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
          <SubmitButton pendingText={messages.sendingResetLink} className={primaryButtonClass}>
            {messages.sendResetLink}
          </SubmitButton>
        </form>
      )}
      <Link
        href="/login"
        className="text-center text-sm text-text-tertiary transition-colors hover:text-accent"
      >
        {messages.backToLogin}
      </Link>
    </div>
  );
}
