"use client";

import { useState, type ReactNode } from "react";
import type { Locale, Messages } from "@borocean/shared";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { AIAnalysisPanel } from "./ai-analysis-panel";
import { FundamentalsPanel } from "./fundamentals-panel";
import { PriceChart } from "./price-chart";

type Tab = "overview" | "fundamentals" | "technical" | "ai";

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

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: t.overviewTab },
    { id: "fundamentals", label: t.fundamentalsTab },
    { id: "technical", label: t.technicalTab },
    { id: "ai", label: t.aiTab },
  ];

  return (
    <div>
      <div role="tablist" aria-label={t.tabsLabel} className="mb-5 flex gap-2">
        {tabs.map((item) => (
          <ToggleChip
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            active={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </ToggleChip>
        ))}
      </div>

      {tab === "overview" && overviewContent}
      {tab === "fundamentals" && (
        <FundamentalsPanel exchange={exchange} symbol={symbol} locale={locale} messages={messages} />
      )}
      {tab === "technical" && <PriceChart exchange={exchange} symbol={symbol} messages={messages} />}
      {tab === "ai" && <AIAnalysisPanel exchange={exchange} symbol={symbol} messages={messages} />}
    </div>
  );
}
