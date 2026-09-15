"use client";

import { useEffect, useState } from "react";
import type { Messages } from "@trendus/shared";

type ScoreFactor = {
  name: string;
  points: number;
  max_points: number;
};

type StockScore = {
  value: number;
  label: string;
  factors: ScoreFactor[];
};

type ScoreResponse = {
  score: StockScore | null;
  warnings: string[];
};

export function ScoreBadge({
  exchange,
  symbol,
  messages,
}: {
  exchange: string;
  symbol: string;
  messages: Messages;
}) {
  const [data, setData] = useState<ScoreResponse | null>(null);
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
          `${apiUrl}/symbols/score?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`,
          { signal: controller.signal, cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error("Score request failed");
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

  const score = data?.score ?? null;

  return (
    <div>
      <h2>{t.score.title}</h2>
      {fetchFailed || !score ? (
        <p>{t.score.noData}</p>
      ) : (
        <>
          <p>
            <strong>
              {score.value} {t.score.outOf}
            </strong>{" "}
            — <strong>{score.label}</strong>
          </p>
          <details>
            <summary>{t.score.explanationToggle}</summary>
            <ul>
              {score.factors.map((factor) => (
                <li key={factor.name}>
                  {factor.name}: {factor.points} / {factor.max_points}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
