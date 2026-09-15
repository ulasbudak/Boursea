"use client";

import Link from "next/link";
import { useState } from "react";
import { formatCompactNumber, formatRatio, type Locale, type Messages } from "@trendus/shared";

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

export function ScreenerForm({ messages, locale }: { messages: Messages["screener"]; locale: Locale }) {
  const [criteria, setCriteria] = useState<Criteria>(EMPTY_CRITERIA);
  const [results, setResults] = useState<ScreenerResult[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof Criteria>(key: K, value: string) {
    setCriteria((prev) => ({ ...prev, [key]: value }));
  }

  async function runScreen(e: React.FormEvent) {
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
    <div>
      <form onSubmit={runScreen}>
        <label>
          {messages.exchangeLabel}
          <select value={criteria.exchange} onChange={(e) => update("exchange", e.target.value)}>
            <option value="ALL">{messages.exchangeAll}</option>
            <option value="US">{messages.exchangeUs}</option>
            <option value="BIST">{messages.exchangeBist}</option>
          </select>
        </label>
        <label>
          {messages.marketCapMinLabel}
          <input
            type="number"
            value={criteria.market_cap_min}
            onChange={(e) => update("market_cap_min", e.target.value)}
          />
        </label>
        <label>
          {messages.marketCapMaxLabel}
          <input
            type="number"
            value={criteria.market_cap_max}
            onChange={(e) => update("market_cap_max", e.target.value)}
          />
        </label>
        <label>
          {messages.peMinLabel}
          <input type="number" value={criteria.pe_min} onChange={(e) => update("pe_min", e.target.value)} />
        </label>
        <label>
          {messages.peMaxLabel}
          <input type="number" value={criteria.pe_max} onChange={(e) => update("pe_max", e.target.value)} />
        </label>
        <label>
          {messages.roeMinLabel}
          <input type="number" value={criteria.roe_min} onChange={(e) => update("roe_min", e.target.value)} />
        </label>
        <label>
          {messages.debtToEquityMaxLabel}
          <input
            type="number"
            value={criteria.debt_to_equity_max}
            onChange={(e) => update("debt_to_equity_max", e.target.value)}
          />
        </label>
        <label>
          {messages.sectorLabel}
          <input
            type="text"
            placeholder={messages.sectorPlaceholder}
            value={criteria.sector}
            onChange={(e) => update("sector", e.target.value)}
          />
        </label>
        <label>
          {messages.rsiMinLabel}
          <input type="number" value={criteria.rsi_min} onChange={(e) => update("rsi_min", e.target.value)} />
        </label>
        <label>
          {messages.rsiMaxLabel}
          <input type="number" value={criteria.rsi_max} onChange={(e) => update("rsi_max", e.target.value)} />
        </label>
        <label>
          {messages.volumeMinLabel}
          <input
            type="number"
            value={criteria.volume_min}
            onChange={(e) => update("volume_min", e.target.value)}
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? messages.running : messages.runButton}
        </button>
      </form>

      {warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}

      {results !== null && (
        <div>
          <h2>{messages.resultsTitle}</h2>
          {results.length === 0 ? (
            <p>{messages.noResults}</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{messages.columnSymbol}</th>
                  <th>{messages.columnName}</th>
                  <th>{messages.columnExchange}</th>
                  <th>{messages.columnSector}</th>
                  <th>{messages.columnPeRatio}</th>
                  <th>{messages.columnMarketCap}</th>
                  <th>{messages.columnRoe}</th>
                  <th>{messages.columnRsi}</th>
                  <th>{messages.columnVolume}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={`${result.exchange}-${result.symbol}`}>
                    <td>
                      <Link href={`/stock/${result.exchange}/${result.symbol}`}>{result.symbol}</Link>
                    </td>
                    <td>{result.name}</td>
                    <td>{result.exchange}</td>
                    <td>{result.sector ?? "—"}</td>
                    <td>{result.pe_ratio !== null ? formatRatio(result.pe_ratio, locale) : "—"}</td>
                    <td>{result.market_cap !== null ? formatCompactNumber(result.market_cap, locale) : "—"}</td>
                    <td>{result.roe !== null ? formatRatio(result.roe, locale) : "—"}</td>
                    <td>{result.rsi !== null ? formatRatio(result.rsi, locale) : "—"}</td>
                    <td>{result.volume !== null ? formatCompactNumber(result.volume, locale) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
