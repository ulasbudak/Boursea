"use client";

import type { Locale, Messages } from "@boursea/shared";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { setLocale } from "./actions";

export function LanguageSwitcher({
  currentLocale,
  messages,
}: {
  currentLocale: Locale;
  messages: Messages["settings"];
}) {
  return (
    <div className="flex gap-2" role="group" aria-label={messages.language}>
      <ToggleChip
        active={currentLocale === "tr"}
        disabled={currentLocale === "tr"}
        onClick={() => setLocale("tr")}
      >
        {messages.turkish}
      </ToggleChip>
      <ToggleChip
        active={currentLocale === "en"}
        disabled={currentLocale === "en"}
        onClick={() => setLocale("en")}
      >
        {messages.english}
      </ToggleChip>
    </div>
  );
}
