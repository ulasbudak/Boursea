"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice, formatSignedPercent, type Locale, type Messages } from "@trendus/shared";
import { Card } from "@/components/ui/card";
import { Badge, ChangeValue } from "@/components/ui/change-value";
import { fetchHighlights, type Highlight } from "@/lib/highlights-client";

export function Highlights({ messages, locale }: { messages: Messages["highlights"]; locale: Locale }) {
  const t = messages;
  const [highlights, setHighlights] = useState<Highlight[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await fetchHighlights();
        if (!cancelled) {
          setHighlights(data.highlights);
          setWarnings(data.warnings);
        }
      } catch {
        if (!cancelled) setError(t.loadError);
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, [t.loadError]);

  if (error) return null;
  if (highlights === null) return <p className="text-sm text-text-tertiary">{t.loading}</p>;
  if (highlights.length === 0) {
    return (
      <Card className="text-center">
        <p className="text-sm text-text-secondary">
          {warnings[0] ?? t.empty}{" "}
          {warnings.length > 0 && (
            <Link href="/settings" className="text-accent hover:underline">
              →
            </Link>
          )}
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {highlights.map((h) => (
        <Link
          key={`${h.exchange}-${h.symbol}`}
          href={`/stock/${h.exchange}/${h.symbol}`}
          className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface p-3 text-sm transition-colors hover:border-accent/50 hover:bg-surface-hover"
        >
          <Badge>{h.exchange}</Badge>
          <span className="font-semibold text-text-primary">{h.symbol}</span>
          <span className="truncate text-text-tertiary">{h.name}</span>
          <span className="ml-auto text-right tabular-nums">
            {h.price !== null && (
              <span className="block text-text-primary">{formatPrice(h.price, "USD", locale)}</span>
            )}
            {h.change_pct !== null && h.change_abs !== null && (
              <ChangeValue value={h.change_abs}>{formatSignedPercent(h.change_pct, locale)}</ChangeValue>
            )}
          </span>
        </Link>
      ))}
    </div>
  );
}
