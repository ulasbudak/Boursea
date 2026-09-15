"use client";

import type { Locale, Messages } from "@trendus/shared";
import { setLocale } from "./actions";

export function LanguageSwitcher({
  currentLocale,
  messages,
}: {
  currentLocale: Locale;
  messages: Messages["settings"];
}) {
  return (
    <div role="radiogroup" aria-label={messages.language}>
      <button
        type="button"
        role="radio"
        aria-checked={currentLocale === "tr"}
        disabled={currentLocale === "tr"}
        onClick={() => setLocale("tr")}
      >
        {messages.turkish}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={currentLocale === "en"}
        disabled={currentLocale === "en"}
        onClick={() => setLocale("en")}
      >
        {messages.english}
      </button>
    </div>
  );
}
