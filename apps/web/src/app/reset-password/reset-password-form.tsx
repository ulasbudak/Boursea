"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import type { Messages } from "@borocean/shared";
import { Field, IconInput, Label } from "@/components/ui/input";
import { Notice } from "@/components/auth/notice";
import { SubmitButton } from "../login/submit-button";
import { primaryButtonClass } from "@/components/auth/button-styles";
import { updatePassword, type ResetPasswordState } from "./actions";

export function ResetPasswordForm({ messages }: { messages: Messages["auth"] }) {
  const [state, formAction] = useActionState<ResetPasswordState, FormData>(updatePassword, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <Notice tone="error">
          {messages.errors[state.error]}
          {state.error === "sessionMissing" && (
            <Link href="/forgot-password" className="mt-1 block underline">
              {messages.forgotPassword}
            </Link>
          )}
        </Notice>
      )}
      <Field>
        <Label htmlFor="password">{messages.newPassword}</Label>
        <IconInput
          icon={<Lock size={16} />}
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
        />
      </Field>
      <Field>
        <Label htmlFor="confirmPassword">{messages.confirmNewPassword}</Label>
        <IconInput
          icon={<Lock size={16} />}
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
        />
      </Field>
      <SubmitButton pendingText={messages.updatingPassword} className={`mt-2 ${primaryButtonClass}`}>
        {messages.updatePassword}
      </SubmitButton>
    </form>
  );
}
