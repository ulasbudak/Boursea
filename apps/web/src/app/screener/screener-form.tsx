"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { RotateCcw, Search } from "lucide-react";
import { formatCompactNumber, formatRatio, type Locale, type Messages } from "@trendus/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/change-value";

type ScreenerResult = {
  symbol: string;
  exchange: string;
  name: string;
  sector: string | null;
  pe_ratio: number | null;
  market_cap: number | null;
  roe: number | null;
  rsi: number | null;
  volume: number | null;
};

type ScreenerResponse = {
  results: ScreenerResult[];
  warnings: string[];
};

type Criteria = {
  exchange: string;
  market_cap_min: string;
  market_cap_max: string;
  pe_min: string;
  pe_max: string;
  roe_min: string;
  debt_to_equity_max: string;
  sector: string;
  rsi_min: string;
  rsi_max: string;
  volume_min: string;
};

const EMPTY_CRITERIA: Criteria = {
  exchange: "ALL",
  market_cap_min: "",
  market_cap_max: "",
  pe_min: "",
  pe_max: "",
  roe_min: "",
  debt_to_equity_max: "",
  sector: "",
  rsi_min: "",
  rsi_max: "",
  volume_min: "",
};

// Skorlama motorunun kalite eşikleriyle hizalı öneri değerleri (bkz. apps/api/app/scoring.py):
// F/K<25 ve ROE>15 "iyi" puan alıyor, Borç/Özsermaye<2 "kabul edilebilir" sayılıyor,
// RSI 30-70 aralığı aşırı alım/satım bölgelerinin (0 puan) dışında kalıyor.
const SUGGESTED_CRITERIA: Criteria = {
  ...EMPTY_CRITERIA,
  pe_max: "25",
  roe_min: "15",
  debt_to_equity_max: "2",
  rsi_min: "30",
  rsi_max: "70",
};

/** Mirrors scoring.py's RSI tiers: 40-60 neutral/healthy, 30-40 & 60-70 caution, else extreme. */
function rsiTone(rsi: number): "positive" | "warning" | "negative" | "neutral" {
  if (rsi < 30 || rsi > 70) return "negative";
  if (rsi < 40 || rsi > 60) return "warning";
  return "positive";
}

const rsiToneClass: Record<ReturnType<typeof rsiTone>, string> = {
  positive: "text-positive",
  warning: "text-warning",
  negative: "text-negative",
  neutral: "text-text-primary",
};

export function ScreenerForm({ messages, locale }: { messages: Messages["screener"]; locale: Locale }) {
  const [criteria, setCriteria] = useState<Criteria>(SUGGESTED_CRITERIA);
  const [results, setResults] = useState<ScreenerResult[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof Criteria>(key: K, value: string) {
    setCriteria((prev) => ({ ...prev, [key]: value }));
  }

  async function runScreen(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(criteria)) {
        if (value.trim()) {
          params.set(key, value.trim());
        }
      }
      const response = await fetch(`${apiUrl}/screener/run?${params.toString()}`);
      const data: ScreenerResponse = await response.json();
      setResults(data.results);
      setWarnings(data.warnings);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <p className="mb-4 text-xs text-text-tertiary">{messages.defaultsNote}</p>
        <form onSubmit={runScreen} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field>
              <Label htmlFor="exchange">{messages.exchangeLabel}</Label>
              <Select
                id="exchange"
                value={criteria.exchange}
                onChange={(e) => update("exchange", e.target.value)}
              >
                <option value="ALL">{messages.exchangeAll}</option>
                <option value="US">{messages.exchangeUs}</option>
                <option value="BIST">{messages.exchangeBist}</option>
              </Select>
            </Field>
            <Field>
              <Label htmlFor="sector">{messages.sectorLabel}</Label>
              <Input
                id="sector"
                type="text"
                placeholder={messages.sectorPlaceholder}
                value={criteria.sector}
                onChange={(e) => update("sector", e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="market_cap_min">{messages.marketCapMinLabel}</Label>
              <Input
                id="market_cap_min"
                type="number"
                value={criteria.market_cap_min}
                onChange={(e) => update("market_cap_min", e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="market_cap_max">{messages.marketCapMaxLabel}</Label>
              <Input
                id="market_cap_max"
                type="number"
                value={criteria.market_cap_max}
                onChange={(e) => update("market_cap_max", e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="pe_min">{messages.peMinLabel}</Label>
              <Input
                id="pe_min"
                type="number"
                value={criteria.pe_min}
                onChange={(e) => update("pe_min", e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="pe_max">{messages.peMaxLabel}</Label>
              <Input
                id="pe_max"
                type="number"
                value={criteria.pe_max}
                onChange={(e) => update("pe_max", e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="roe_min">{messages.roeMinLabel}</Label>
              <Input
                id="roe_min"
                type="number"
                value={criteria.roe_min}
                onChange={(e) => update("roe_min", e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="debt_to_equity_max">{messages.debtToEquityMaxLabel}</Label>
              <Input
                id="debt_to_equity_max"
                type="number"
                value={criteria.debt_to_equity_max}
                onChange={(e) => update("debt_to_equity_max", e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="rsi_min">{messages.rsiMinLabel}</Label>
              <Input
                id="rsi_min"
                type="number"
                value={criteria.rsi_min}
                onChange={(e) => update("rsi_min", e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="rsi_max">{messages.rsiMaxLabel}</Label>
              <Input
                id="rsi_max"
                type="number"
                value={criteria.rsi_max}
                onChange={(e) => update("rsi_max", e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="volume_min">{messages.volumeMinLabel}</Label>
              <Input
                id="volume_min"
                type="number"
                value={criteria.volume_min}
                onChange={(e) => update("volume_min", e.target.value)}
              />
            </Field>
          </div>

          <div className="flex gap-2 border-t border-border-subtle pt-4">
            <Button type="submit" disabled={loading} className="gap-2">
              <Search size={16} />
              {loading ? messages.running : messages.runButton}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="gap-2"
              onClick={() => setCriteria(SUGGESTED_CRITERIA)}
            >
              <RotateCcw size={14} />
              {messages.resetDefaults}
            </Button>
          </div>
        </form>
      </Card>

      {warnings.map((warning) => (
        <p key={warning} className="text-sm text-warning">
          {warning}
        </p>
      ))}

      {results !== null && (
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
            {messages.resultsTitle} {results.length > 0 && `(${results.length})`}
          </h2>
          {results.length === 0 ? (
            <Card className="text-center text-sm text-text-tertiary">{messages.noResults}</Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-text-tertiary">
                    <th className="px-4 py-3 font-medium">{messages.columnSymbol}</th>
                    <th className="px-4 py-3 font-medium">{messages.columnName}</th>
                    <th className="px-4 py-3 font-medium">{messages.columnExchange}</th>
                    <th className="px-4 py-3 font-medium">{messages.columnSector}</th>
                    <th className="px-4 py-3 text-right font-medium">{messages.columnPeRatio}</th>
                    <th className="px-4 py-3 text-right font-medium">{messages.columnMarketCap}</th>
                    <th className="px-4 py-3 text-right font-medium">{messages.columnRoe}</th>
                    <th className="px-4 py-3 text-right font-medium">{messages.columnRsi}</th>
                    <th className="px-4 py-3 text-right font-medium">{messages.columnVolume}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {results.map((result) => (
                    <tr key={`${result.exchange}-${result.symbol}`} className="transition-colors hover:bg-surface-hover">
                      <td className="px-4 py-3">
                        <Link
                          href={`/stock/${result.exchange}/${result.symbol}`}
                          className="font-semibold text-text-primary hover:text-accent"
                        >
                          {result.symbol}
                        </Link>
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-text-secondary">{result.name}</td>
                      <td className="px-4 py-3">
                        <Badge>{result.exchange}</Badge>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{result.sector ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-text-primary">
                        {result.pe_ratio !== null ? formatRatio(result.pe_ratio, locale) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-text-primary">
                        {result.market_cap !== null ? formatCompactNumber(result.market_cap, locale) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-text-primary">
                        {result.roe !== null ? formatRatio(result.roe, locale) : "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums font-medium ${
                          result.rsi !== null ? rsiToneClass[rsiTone(result.rsi)] : "text-text-primary"
                        }`}
                      >
                        {result.rsi !== null ? formatRatio(result.rsi, locale) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-text-primary">
                        {result.volume !== null ? formatCompactNumber(result.volume, locale) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
