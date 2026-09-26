"use server";

import { authErrorKey, type AuthErrorMessages } from "@borocean/shared";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-origin";

export type ForgotPasswordState = {
  email: string;
  error?: keyof AuthErrorMessages;
  sent?: boolean;
};

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getSiteOrigin()}/auth/oauth?next=/reset-password&flow=recovery`,
  });
  if (error) {
    return { email, error: authErrorKey(error.code) };
  }
  // Same answer whether or not an account exists, so this form can't be used to probe emails.
  return { email, sent: true };
}
