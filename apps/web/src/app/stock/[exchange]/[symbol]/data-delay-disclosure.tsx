"use client";

import { useEffect, useState } from "react";
import type { Messages } from "@trendus/shared";
import { fetchEntitlement } from "@/lib/entitlements-client";

export function DataDelayDisclosure({ messages }: { messages: Messages["billing"] }) {
  const [showDisclosure, setShowDisclosure] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const entitlement = await fetchEntitlement();
        if (!cancelled) setShowDisclosure(!entitlement.realtime_data);
      } catch {
        // Best-effort — no disclosure shown if the entitlement can't be fetched.
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!showDisclosure) return null;

  return <p className="text-xs text-text-tertiary">{messages.delayedDataDisclosure}</p>;
}
