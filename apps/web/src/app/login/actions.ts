"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authErrorKey, type AuthErrorMessages } from "@borocean/shared";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-origin";

export type AuthFormState = {
  email: string;
  error?: keyof AuthErrorMessages;
  /** Sign-up succeeded but the address still has to be verified from the email link. */
  checkEmail?: boolean;
};

export async function authenticate(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const intent = formData.get("intent");
  const supabase = await createClient();

  if (intent === "signup") {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${await getSiteOrigin()}/auth/oauth?next=/dashboard&flow=signup`,
      },
    });
    if (error) {
      return { email, error: authErrorKey(error.code) };
    }
    // With email confirmation on there is no session yet. (Supabase also answers this way
    // for an already-registered address, so we can't — and don't — tell the two apart.)
    if (!data.session) {
      return { email, checkEmail: true };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { email, error: authErrorKey(error.code) };
    }
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
