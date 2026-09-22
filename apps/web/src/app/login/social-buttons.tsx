"use client";

import { useState } from "react";
import type { Messages } from "@boursea/shared";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => handleOAuthSignIn("google")}
        disabled={loadingProvider !== null}
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#4285F4] text-[10px] font-bold text-white">
          G
        </span>
        {loadingProvider === "google" ? messages.redirecting : messages.continueWithGoogle}
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => handleOAuthSignIn("apple")}
        disabled={loadingProvider !== null}
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-text-primary text-[10px] font-bold text-canvas">

        </span>
        {loadingProvider === "apple" ? messages.redirecting : messages.continueWithApple}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-negative">
          {error}
        </p>
      )}
    </div>
  );
}
