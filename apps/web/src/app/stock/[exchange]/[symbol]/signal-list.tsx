"use client";

import { useEffect, useState } from "react";
import type { Messages } from "@trendus/shared";

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
    return <p>{t.common.loading}</p>;
  }

  const signals = data?.signals ?? [];
  const warnings = data?.warnings ?? [];

  return (
    <div>
      <h2>{t.signals.title}</h2>
      {fetchFailed && <p role="alert">{t.common.dataUnavailable}</p>}
      {!fetchFailed &&
        warnings.map((warning) => (
          <p key={warning} role="status">
            {warning}
          </p>
        ))}
      {!fetchFailed && signals.length === 0 && <p>{t.signals.noSignals}</p>}
      {!fetchFailed && signals.length > 0 && (
        <ul>
          {signals.map((signal, index) => (
            <li key={`${signal.rule_id}-${signal.triggered_at}-${index}`}>
              <strong>{signal.direction === "bullish" ? t.signals.bullish : t.signals.bearish}</strong>{" "}
              {signal.rule_name} — {new Date(signal.triggered_at * 1000).toLocaleDateString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
