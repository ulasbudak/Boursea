"use server";

import { redirect } from "next/navigation";
import { authErrorKey, type AuthErrorMessages } from "@borocean/shared";
import { createClient } from "@/lib/supabase/server";

export type ResetPasswordState = {
  error?: keyof AuthErrorMessages;
};

export async function updatePassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmPassword") ?? "");
  if (password !== confirmation) {
    return { error: "passwordMismatch" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: authErrorKey(error.code) };
  }

  // Sign out so the user proves the new password works on the next login.
  await supabase.auth.signOut();
  redirect("/login?notice=password_updated");
}
