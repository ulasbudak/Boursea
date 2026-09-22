"use client";

import { useEffect, useState } from "react";
import type { Messages } from "@boursea/shared";
import { ToggleChip } from "./toggle-chip";

type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "boursea-theme";

function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", preference);
  }
}

/** Persists to localStorage + `[data-theme]` on `<html>`; the inline script in layout.tsx applies it pre-hydration to avoid a flash. */
export function ThemeToggle({ messages }: { messages: Messages["settings"] }) {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    function syncFromStorage() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark") {
          setPreference(stored);
        }
      } catch {
        // localStorage unavailable (private mode, blocked) — fall back to system.
      }
    }

    syncFromStorage();
  }, []);

  function select(next: ThemePreference) {
    setPreference(next);
    applyTheme(next);
    try {
      if (next === "system") {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // localStorage unavailable — theme still applies for this page load.
    }
  }

  return (
    <div className="flex gap-2" role="group" aria-label={messages.theme}>
      <ToggleChip active={preference === "system"} onClick={() => select("system")}>
        {messages.themeSystem}
      </ToggleChip>
      <ToggleChip active={preference === "light"} onClick={() => select("light")}>
        {messages.themeLight}
      </ToggleChip>
      <ToggleChip active={preference === "dark"} onClick={() => select("dark")}>
        {messages.themeDark}
      </ToggleChip>
    </div>
  );
}
