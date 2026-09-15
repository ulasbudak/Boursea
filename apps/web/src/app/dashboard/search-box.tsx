"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Messages } from "@trendus/shared";

type SymbolResult = {
  symbol: string;
  name: string;
  exchange: string;
};

type SearchResponse = {
  results: SymbolResult[];
  warnings: string[];
};

const DEBOUNCE_MS = 300;

export function SearchBox({ messages }: { messages: Messages["search"] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolResult[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(
          `${apiUrl}/symbols/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("Search request failed");
        }
        const data: SearchResponse = await response.json();
        setResults(data.results);
        setWarnings(data.warnings);
        setSearched(true);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(messages.searchError);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [query, messages.searchError]);

  function handleChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setWarnings([]);
      setSearched(false);
      setError(null);
    }
  }

  return (
    <div>
      <input
        type="text"
        placeholder={messages.placeholder}
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        aria-label={messages.label}
      />
      {loading && <p>{messages.searching}</p>}
      {error && <p role="alert">{error}</p>}
      {warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
      {searched && !loading && results.length === 0 && <p>{messages.noResults}</p>}
      <ul>
        {results.map((result) => (
          <li key={`${result.exchange}-${result.symbol}`}>
            <Link href={`/stock/${result.exchange}/${result.symbol}`}>
              <span>{result.exchange}</span> <strong>{result.symbol}</strong> —{" "}
              {result.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
