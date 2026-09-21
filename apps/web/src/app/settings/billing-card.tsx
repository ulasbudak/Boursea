"use client";

import { useEffect, useState } from "react";
import type { Messages } from "@trendus/shared";
import { Button } from "@/components/ui/button";
import { TextBlockSkeleton } from "@/components/ui/skeleton";
import { fetchEntitlement, type Entitlement } from "@/lib/entitlements-client";

function limitText(limit: number | null, unlimitedLabel: string): string {
  return limit === null ? unlimitedLabel : String(limit);
}

export function BillingCard({ messages }: { messages: Messages["billing"] }) {
  const t = messages;
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await fetchEntitlement();
        if (!cancelled) setEntitlement(data);
      } catch {
        // Best-effort — settings page still works without the billing summary.
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!entitlement) return <TextBlockSkeleton lines={4} />;

  const rows = [
    { label: t.watchlistLimitLabel, value: limitText(entitlement.watchlist_item_limit, t.unlimitedLabel) },
    { label: t.alertLimitLabel, value: limitText(entitlement.alert_limit, t.unlimitedLabel) },
    { label: t.signalAlertLimitLabel, value: limitText(entitlement.signal_alert_limit, t.unlimitedLabel) },
    { label: t.portfolioLimitLabel, value: limitText(entitlement.portfolio_limit, t.unlimitedLabel) },
    {
      label: t.advancedIndicatorsLabel,
      value: entitlement.advanced_indicators ? t.unlockedLabel : t.lockedLabel,
    },
    {
      label: t.realtimeDataLabel,
      value: entitlement.realtime_data ? t.unlockedLabel : t.lockedLabel,
    },
    {
      label: t.aiReportsLabel,
      value: entitlement.ai_reports ? t.unlockedLabel : t.lockedLabel,
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            entitlement.tier === "free"
              ? "bg-surface-hover text-text-secondary"
              : "bg-accent/15 text-accent"
          }`}
        >
          {entitlement.tier === "premium"
            ? t.premiumLabel
            : entitlement.tier === "promo"
              ? t.promoLabel
              : t.freeLabel}
        </span>
      </div>
      {entitlement.tier === "promo" && <p className="mb-3 text-xs text-text-tertiary">{t.promoHint}</p>}

      <dl className="flex flex-col divide-y divide-border-subtle">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2 text-sm">
            <dt className="text-text-secondary">{row.label}</dt>
            <dd className="font-medium text-text-primary">{row.value}</dd>
          </div>
        ))}
      </dl>

      {entitlement.tier === "free" && (
        <div className="mt-4">
          <Button type="button" disabled title={t.comingSoon}>
            {t.upgradeButton}
          </Button>
          <p className="mt-1.5 text-xs text-text-tertiary">{t.comingSoon}</p>
        </div>
      )}
    </div>
  );
}
