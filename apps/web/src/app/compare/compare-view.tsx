"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { formatCompactNumber, formatRatio, type Locale, type Messages } from "@trendus/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconInput } from "@/components/ui/input";
import { Badge } from "@/components/ui/change-value";

type SymbolResult = { symbol: string; name: string; exchange: string };

type SearchResponse = { results: SymbolResult[]; warnings: string[] };

type FundamentalsSnapshot = {
  pe_ratio: number | null;
  market_cap: number | null;
  roe: number | null;
  debt_to_equity: number | null;
  net_margin: number | null;
};

type StockScore = { value: number; label: string };

type ComparisonEntry = {
  symbol: string;
  exchange: string;
  fundamentals: FundamentalsSnapshot | null;
  score: StockScore | null;
  rsi: number | null;
  warnings: string[];
};

type ComparisonResponse = { results: ComparisonEntry[]; warnings: string[] };

const MAX_SYMBOLS = 4;
const DEBOUNCE_MS = 300;

function rsiTone(rsi: number): "positive" | "warning" | "negative" {
  if (rsi < 30 || rsi > 70) return "negative";
  if (rsi < 40 || rsi > 60) return "warning";
  return "positive";
}

const toneClass: Record<"positive" | "warning" | "negative", string> = {
  positive: "text-positive",
  warning: "text-warning",
  negative: "text-negative",
};

function bestWorst(
  values: (number | null)[],
  direction: "higher" | "lower"
): { best: number | null; worst: number | null } {
  const defined = values
    .map((v, i) => ({ v, i }))
    .filter((x): x is { v: number; i: number } => x.v !== null);
  if (defined.length < 2) return { best: null, worst: null };
  const sorted = [...defined].sort((a, b) => (direction === "higher" ? b.v - a.v : a.v - b.v));
  if (sorted[0].v === sorted[sorted.length - 1].v) return { best: null, worst: null };
  return { best: sorted[0].i, worst: sorted[sorted.length - 1].i };
}

function MetricRow({
  label,
  values,
  format,
  direction,
  locale,
}: {
  label: string;
  values: (number | null)[];
  format: (v: number, locale: Locale) => string;
  direction?: "higher" | "lower";
  locale: Locale;
}) {
  const { best, worst } = direction ? bestWorst(values, direction) : { best: null, worst: null };
  return (
    <tr className="border-b border-border-subtle">
      <td className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
        {label}
      </td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`px-4 py-3 text-right tabular-nums font-medium ${
            i === best ? "text-positive" : i === worst ? "text-negative" : "text-text-primary"
          }`}
        >
          {v !== null ? format(v, locale) : "—"}
        </td>
      ))}
    </tr>
  );
}

export function CompareView({ messages, locale }: { messages: Messages["comparison"]; locale: Locale }) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SymbolResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SymbolResult[]>([]);
  const [results, setResults] = useState<ComparisonEntry[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setSearching(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(
          `${apiUrl}/symbols/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        const data: SearchResponse = await response.json();
        setSearchResults(data.results);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [query]);

  function addSymbol(result: SymbolResult) {
    if (selected.length >= MAX_SYMBOLS) return;
    if (selected.some((s) => s.symbol === result.symbol && s.exchange === result.exchange)) return;
    setSelected((prev) => [...prev, result]);
    setQuery("");
    setSearchResults([]);
  }

  function removeSymbol(result: SymbolResult) {
    setSelected((prev) => prev.filter((s) => !(s.symbol === result.symbol && s.exchange === result.exchange)));
    setResults(null);
  }

  async function runComparison() {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const symbolsParam = selected.map((s) => `${s.symbol}:${s.exchange}`).join(",");
      const response = await fetch(`${apiUrl}/compare?symbols=${encodeURIComponent(symbolsParam)}`);
      if (!response.ok) throw new Error("Comparison request failed");
      const data: ComparisonResponse = await response.json();
      setResults(data.results);
      setWarnings(data.warnings);
    } catch {
      setWarnings([messages.loadError]);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  const canCompare = selected.length >= 2 && selected.length <= MAX_SYMBOLS;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <IconInput
          icon={<Search size={16} />}
          type="text"
          placeholder={messages.searchPlaceholder}
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            if (!value.trim()) {
              setSearchResults([]);
            }
          }}
        />
        {searching && <p className="mt-2 text-xs text-text-tertiary">{messages.running}</p>}
        {searchResults.length > 0 && (
          <ul className="mt-2 flex flex-col divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle">
            {searchResults.map((result) => (
              <li key={`${result.exchange}-${result.symbol}`} className="flex items-center gap-2 px-3 py-2.5 text-sm">
                <Badge>{result.exchange}</Badge>
                <strong className="font-semibold text-text-primary">{result.symbol}</strong>
                <span className="truncate text-text-secondary">{result.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  className="ml-auto"
                  disabled={selected.length >= MAX_SYMBOLS}
                  onClick={() => addSymbol(result)}
                >
                  {messages.addButton}
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {selected.map((s) => (
            <span
              key={`${s.exchange}-${s.symbol}`}
              className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-hover px-3 py-1 text-xs font-medium text-text-primary"
            >
              {s.symbol}
              <button type="button" onClick={() => removeSymbol(s)} aria-label={messages.removeButton}>
                <X size={12} className="text-text-tertiary hover:text-negative" />
              </button>
            </span>
          ))}
        </div>

        <p className="mt-3 text-xs text-text-tertiary">
          {selected.length < 2 ? messages.minHint : messages.maxHint}
        </p>

        <div className="mt-4 border-t border-border-subtle pt-4">
          <Button type="button" disabled={!canCompare || loading} onClick={runComparison}>
            {loading ? messages.running : messages.runButton}
          </Button>
        </div>
      </Card>

      {warnings.map((warning) => (
        <p key={warning} className="text-sm text-warning">
          {warning}
        </p>
      ))}

      {results !== null && results.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
            {messages.resultsTitle}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-text-tertiary">
                  <th className="px-4 py-3 font-medium">{messages.rowSymbol}</th>
                  {results.map((entry) => (
                    <th key={`${entry.exchange}-${entry.symbol}`} className="px-4 py-3 text-right font-medium">
                      {entry.symbol}
                      <span className="ml-1.5 rounded bg-surface-hover px-1.5 py-0.5 text-[10px] text-text-tertiary">
                        {entry.exchange}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <MetricRow
                  label={messages.rowPeRatio}
                  values={results.map((e) => e.fundamentals?.pe_ratio ?? null)}
                  format={formatRatio}
                  direction="lower"
                  locale={locale}
                />
                <MetricRow
                  label={messages.rowMarketCap}
                  values={results.map((e) => e.fundamentals?.market_cap ?? null)}
                  format={formatCompactNumber}
                  locale={locale}
                />
                <MetricRow
                  label={messages.rowRoe}
                  values={results.map((e) => e.fundamentals?.roe ?? null)}
                  format={formatRatio}
                  direction="higher"
                  locale={locale}
                />
                <MetricRow
                  label={messages.rowDebtToEquity}
                  values={results.map((e) => e.fundamentals?.debt_to_equity ?? null)}
                  format={formatRatio}
                  direction="lower"
                  locale={locale}
                />
                <MetricRow
                  label={messages.rowNetMargin}
                  values={results.map((e) => e.fundamentals?.net_margin ?? null)}
                  format={formatRatio}
                  direction="higher"
                  locale={locale}
                />
                <tr className="border-b border-border-subtle">
                  <td className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
                    {messages.rowRsi}
                  </td>
                  {results.map((entry, i) => (
                    <td
                      key={i}
                      className={`px-4 py-3 text-right tabular-nums font-medium ${
                        entry.rsi !== null ? toneClass[rsiTone(entry.rsi)] : "text-text-primary"
                      }`}
                    >
                      {entry.rsi !== null ? formatRatio(entry.rsi, locale) : messages.noValue}
                    </td>
                  ))}
                </tr>
                <MetricRow
                  label={messages.rowScore}
                  values={results.map((e) => e.score?.value ?? null)}
                  format={(v) => String(Math.round(v))}
                  direction="higher"
                  locale={locale}
                />
              </tbody>
            </table>
          </div>
        </div>
      )}

      {results === null && <p className="text-center text-sm text-text-tertiary">{messages.emptyState}</p>}
    </div>
  );
}
