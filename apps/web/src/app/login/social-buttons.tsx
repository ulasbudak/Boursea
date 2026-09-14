"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SocialButtons() {
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
        {loadingProvider === "google" ? "Yönlendiriliyor..." : "Google ile devam et"}
      </button>
      <button
        type="button"
        onClick={() => handleOAuthSignIn("apple")}
        disabled={loadingProvider !== null}
      >
        {loadingProvider === "apple" ? "Yönlendiriliyor..." : "Apple ile devam et"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
