"use client";

import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Messages } from "@trendus/shared";
import { Card } from "@/components/ui/card";

type SignalRecord = {
  rule_id: string;
  rule_name: string;
  direction: string;
  triggered_at: number;
};

type SignalsResponse = {
  signals: SignalRecord[];
  warnings: string[];
};

export function SignalList({
  exchange,
  symbol,
  messages,
}: {
  exchange: string;
  symbol: string;
  messages: Messages;
}) {
  const [data, setData] = useState<SignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);

  const t = messages;

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setFetchFailed(false);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(
          `${apiUrl}/symbols/signals?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`,
          { signal: controller.signal, cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error("Signals request failed");
        }
        setData(await response.json());
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFetchFailed(true);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [exchange, symbol]);

  if (loading) {
    return (
      <Card className="mt-4">
        <p className="text-sm text-text-tertiary">{t.common.loading}</p>
      </Card>
    );
  }

  const signals = data?.signals ?? [];
  const warnings = data?.warnings ?? [];

  return (
    <Card className="mt-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
        {t.signals.title}
      </p>
      {fetchFailed && <p className="text-sm text-negative">{t.common.dataUnavailable}</p>}
      {!fetchFailed &&
        warnings.map((warning) => (
          <p key={warning} className="mb-2 text-xs text-warning">
            {warning}
          </p>
        ))}
      {!fetchFailed && signals.length === 0 && (
        <p className="text-sm text-text-tertiary">{t.signals.noSignals}</p>
      )}
      {!fetchFailed && signals.length > 0 && (
        <ul className="flex flex-col divide-y divide-border-subtle">
          {signals.map((signal, index) => {
            const bullish = signal.direction === "bullish";
            return (
              <li
                key={`${signal.rule_id}-${signal.triggered_at}-${index}`}
                className="flex items-center gap-3 py-2.5 text-sm"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    bullish ? "bg-positive/15 text-positive" : "bg-negative/15 text-negative"
                  }`}
                >
                  {bullish ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                </span>
                <span>
                  <strong className={bullish ? "text-positive" : "text-negative"}>
                    {bullish ? t.signals.bullish : t.signals.bearish}
                  </strong>{" "}
                  <span className="text-text-primary">{signal.rule_name}</span>
                </span>
                <span className="ml-auto shrink-0 text-xs text-text-tertiary">
                  {new Date(signal.triggered_at * 1000).toLocaleDateString()}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
