"use client";

import { useState, type ReactNode } from "react";
import type { Locale, Messages } from "@trendus/shared";
import { FundamentalsPanel } from "./fundamentals-panel";

type Tab = "overview" | "fundamentals";

export function StockTabs({
  exchange,
  symbol,
  locale,
  messages,
  overviewContent,
}: {
  exchange: string;
  symbol: string;
  locale: Locale;
  messages: Messages;
  overviewContent: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const t = messages.stock;

  return (
    <div>
      <div role="tablist" aria-label={t.tabsLabel}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "overview"}
          onClick={() => setTab("overview")}
        >
          {t.overviewTab}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "fundamentals"}
          onClick={() => setTab("fundamentals")}
        >
          {t.fundamentalsTab}
        </button>
      </div>

      {tab === "overview" && overviewContent}
      {tab === "fundamentals" && (
        <FundamentalsPanel exchange={exchange} symbol={symbol} locale={locale} messages={messages} />
      )}
    </div>
  );
}
