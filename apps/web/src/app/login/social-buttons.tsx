"use client";

import { useState } from "react";
import type { Messages } from "@trendus/shared";
import { createClient } from "@/lib/supabase/client";

export function SocialButtons({ messages }: { messages: Messages["auth"] }) {
  const [error, setError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<
    "google" | "apple" | null
  >(null);

  async function handleOAuthSignIn(provider: "google" | "apple") {
    setError(null);
    setLoadingProvider(provider);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/oauth?next=${encodeURIComponent(
          "/dashboard"
        )}`,
      },
    });

    if (error) {
      setError(error.message);
      setLoadingProvider(null);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => handleOAuthSignIn("google")}
        disabled={loadingProvider !== null}
      >
        {loadingProvider === "google" ? messages.redirecting : messages.continueWithGoogle}
      </button>
      <button
        type="button"
        onClick={() => handleOAuthSignIn("apple")}
        disabled={loadingProvider !== null}
      >
        {loadingProvider === "apple" ? messages.redirecting : messages.continueWithApple}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
