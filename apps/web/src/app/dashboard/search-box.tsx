"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import type { Messages } from "@boursea/shared";
import { IconInput } from "@/components/ui/input";

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
        if (!controller.signal.aborted) setLoading(false);
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
      <IconInput
        icon={<Search size={16} />}
        type="text"
        placeholder={messages.placeholder}
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        aria-label={messages.label}
      />
      {loading && <p className="mt-2 text-xs text-text-tertiary">{messages.searching}</p>}
      {error && (
        <p role="alert" className="mt-2 text-xs text-negative">
          {error}
        </p>
      )}
      {warnings.map((warning) => (
        <p key={warning} className="mt-2 text-xs text-warning">
          {warning}
        </p>
      ))}
      {searched && !loading && results.length === 0 && (
        <p className="mt-2 text-xs text-text-tertiary">{messages.noResults}</p>
      )}
      {results.length > 0 && (
        <ul className="mt-2 flex flex-col divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle">
          {results.map((result) => (
            <li key={`${result.exchange}-${result.symbol}`}>
              <Link
                href={`/stock/${result.exchange}/${result.symbol}`}
                className="group flex items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-surface-hover"
              >
                <span className="rounded bg-surface-hover px-1.5 py-0.5 text-[10px] font-semibold text-text-tertiary">
                  {result.exchange}
                </span>
                <strong className="font-semibold text-text-primary">{result.symbol}</strong>
                <span className="truncate text-text-secondary">{result.name}</span>
                <ChevronRight
                  size={16}
                  className="ml-auto text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
