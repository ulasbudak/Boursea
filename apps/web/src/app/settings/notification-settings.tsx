"use client";

import { useEffect, useState } from "react";
import type { Messages } from "@trendus/shared";
import { ToggleChip } from "@/components/ui/toggle-chip";
import {
  fetchNotificationSettings,
  updateNotificationSettings,
} from "@/lib/notification-settings-client";

export function NotificationSettings({ messages }: { messages: Messages["settings"] }) {
  const t = messages;
  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const settings = await fetchNotificationSettings();
        if (!cancelled) setEmailEnabled(settings.email_enabled);
      } catch {
        if (!cancelled) setError(t.notificationSaveError);
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, [t.notificationSaveError]);

  async function toggleEmail() {
    if (emailEnabled === null) return;
    const next = !emailEnabled;
    setEmailEnabled(next);
    setError(null);
    try {
      await updateNotificationSettings({ email_enabled: next });
    } catch {
      setEmailEnabled(!next);
      setError(t.notificationSaveError);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary">{t.emailNotificationsLabel}</span>
        <ToggleChip
          active={emailEnabled === true}
          onClick={toggleEmail}
          disabled={emailEnabled === null}
        >
          {emailEnabled === null ? "…" : emailEnabled ? t.on : t.off}
        </ToggleChip>
      </div>
      {error && <p className="text-xs text-negative">{error}</p>}
      <p className="text-xs text-text-tertiary">{t.pushNotSupportedHint}</p>
    </div>
  );
}
