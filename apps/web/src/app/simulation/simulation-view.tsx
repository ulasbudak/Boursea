"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { BIST_ENABLED, formatPrice, formatSignedPercent, type Locale, type Messages } from "@borocean/shared";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Label, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge, ChangeValue } from "@/components/ui/change-value";
import {
  createSimulation,
  deleteSimulation,
  fetchHistory,
  fetchSimulations,
  placeOrder,
  type Simulation,
  type SnapshotPoint,
} from "@/lib/simulations-client";

type SymbolResult = { symbol: string; name: string; exchange: string };

const SYMBOL_SEARCH_DEBOUNCE_MS = 300;

function DailyPnlChart({ points, locale, noData }: { points: SnapshotPoint[]; locale: Locale; noData: string }) {
  const values = points.map((p) => p.pnl_abs);
  const maxValue = values.length ? Math.max(...values, 0) : 0;
  const minValue = values.length ? Math.min(...values, 0) : 0;
  const range = maxValue - minValue || 1;

  if (points.length === 0) {
    return <p className="text-xs text-text-tertiary">{noData}</p>;
  }

  return (
    <div className="flex h-20 items-end gap-1">
      {points.map((point) => {
        const heightPct = ((point.pnl_abs - minValue) / range) * 100;
        return (
          <div
            key={point.snapshot_date}
            title={`${new Date(point.snapshot_date).toLocaleDateString(locale)}: ${formatPrice(point.pnl_abs, "USD", locale)}`}
            className="flex flex-1 flex-col items-center justify-end"
          >
            <div
              className={`w-full rounded-sm transition-all ${point.pnl_abs >= 0 ? "bg-positive" : "bg-negative"}`}
              style={{ height: `${Math.max(heightPct, 3)}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function SimulationView({ messages, locale }: { messages: Messages["simulation"]; locale: Locale }) {
  const t = messages;
  const [simulations, setSimulations] = useState<Simulation[] | null>(null);
  const [histories, setHistories] = useState<Record<string, SnapshotPoint[]>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [creating, setCreating] = useState(false);
  const [openFormFor, setOpenFormFor] = useState<string | null>(null);

  async function load() {
    try {
      const data = await fetchSimulations();
      setSimulations(data.simulations);
      setWarnings(data.warnings);
      setError(null);
      for (const simulation of data.simulations) {
        fetchHistory(simulation.id)
          .then((h) => setHistories((prev) => ({ ...prev, [simulation.id]: h.history })))
          .catch(() => {
            // Best-effort — the simulation card still works without its P&L history.
          });
      }
    } catch {
      setError(t.loadError);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await fetchSimulations();
        if (cancelled) return;
        setSimulations(data.simulations);
        setWarnings(data.warnings);
        setError(null);
        for (const simulation of data.simulations) {
          fetchHistory(simulation.id)
            .then((h) => {
              if (!cancelled) setHistories((prev) => ({ ...prev, [simulation.id]: h.history }));
            })
            .catch(() => {
              // Best-effort.
            });
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

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    const budget = Number(newBudget);
    if (!name || budget <= 0) return;
    setCreating(true);
    try {
      await createSimulation(name, budget);
      setNewName("");
      setNewBudget("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t.deleteSimulationConfirm)) return;
    setSimulations((prev) => prev?.filter((s) => s.id !== id) ?? null);
    try {
      await deleteSimulation(id);
    } catch {
      await load();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t.newSimulationPlaceholder}
            className="flex-1"
          />
          <Input
            type="number"
            min="0"
            step="any"
            value={newBudget}
            onChange={(e) => setNewBudget(e.target.value)}
            placeholder={t.budgetPlaceholder}
            className="w-48"
          />
          <Button
            type="submit"
            disabled={creating || !newName.trim() || !(Number(newBudget) > 0)}
            className="shrink-0 gap-1.5"
          >
            <Plus size={16} />
            {t.createSimulationButton}
          </Button>
        </form>
        <p className="mt-2 text-xs text-text-tertiary">{t.realTimeExecutionNote}</p>
      </Card>

      {error && (
        <p role="alert" className="rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
          {error}
        </p>
      )}
      {warnings.map((warning) => (
        <p key={warning} className="text-xs text-warning">
          {warning}
        </p>
      ))}

      {simulations === null && !error && (
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <Card key={i}>
              <Skeleton className="mb-3 h-5 w-32" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {simulations !== null && simulations.length === 0 && (
        <Card className="text-center">
          <p className="text-sm text-text-secondary">{t.noSimulations}</p>
          <p className="mt-1 text-xs text-text-tertiary">{t.noSimulationsHint}</p>
        </Card>
      )}

      {simulations?.map((simulation) => (
        <Card key={simulation.id}>
          <CardHeader>
            <div>
              <CardTitle>{simulation.name}</CardTitle>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="text-text-tertiary">
                  {t.totalEquityLabel}:{" "}
                  <span className="tabular-nums text-text-primary">
                    {formatPrice(simulation.total_equity, "USD", locale)}
                  </span>
                </span>
                <span className="text-text-tertiary">
                  {t.cashBalanceLabel}:{" "}
                  <span className="tabular-nums text-text-primary">
                    {formatPrice(simulation.cash_balance, "USD", locale)}
                  </span>
                </span>
                {simulation.total_pnl_pct !== null && (
                  <ChangeValue value={simulation.total_pnl_abs}>
                    {formatPrice(simulation.total_pnl_abs, "USD", locale)} (
                    {formatSignedPercent(simulation.total_pnl_pct, locale)})
                  </ChangeValue>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(simulation.id)}
              aria-label={t.deleteSimulationButton}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-text-tertiary transition-colors hover:bg-negative/10 hover:text-negative"
            >
              <Trash2 size={14} />
              {t.deleteSimulationButton}
            </button>
          </CardHeader>

          {simulation.positions.length === 0 ? (
            <p className="text-sm text-text-tertiary">{t.emptyPositions}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-text-tertiary">
                    <th className="py-2 pr-3 font-medium">{t.columnSymbol}</th>
                    <th className="px-3 py-2 text-right font-medium">{t.columnQuantity}</th>
                    <th className="px-3 py-2 text-right font-medium">{t.columnAvgCost}</th>
                    <th className="px-3 py-2 text-right font-medium">{t.columnPrice}</th>
                    <th className="px-3 py-2 text-right font-medium">{t.columnValue}</th>
                    <th className="pl-3 py-2 text-right font-medium">{t.columnPnl}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {simulation.positions.map((position) => (
                    <tr key={position.id}>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <Badge>{position.exchange}</Badge>
                          <Link
                            href={`/stock/${position.exchange}/${position.symbol}`}
                            className="font-semibold text-text-primary hover:text-accent"
                          >
                            {position.symbol}
                          </Link>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">
                        {position.quantity}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">
                        {formatPrice(position.avg_cost, "USD", locale)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">
                        {position.current_price !== null
                          ? formatPrice(position.current_price, "USD", locale)
                          : t.priceUnavailable}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">
                        {position.market_value !== null
                          ? formatPrice(position.market_value, "USD", locale)
                          : "—"}
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        {position.pnl_abs !== null && position.pnl_pct !== null ? (
                          <ChangeValue value={position.pnl_abs}>
                            {formatPrice(position.pnl_abs, "USD", locale)} (
                            {formatSignedPercent(position.pnl_pct, locale)})
                          </ChangeValue>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 border-t border-border-subtle pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
              {t.historyTitle}
            </p>
            <DailyPnlChart points={histories[simulation.id] ?? []} locale={locale} noData={t.noHistoryYet} />
          </div>

          <div className="mt-4 border-t border-border-subtle pt-4">
            {openFormFor === simulation.id ? (
              <PlaceOrderForm
                messages={t}
                onCancel={() => setOpenFormFor(null)}
                onSubmit={async (order) => {
                  await placeOrder(simulation.id, order);
                  setOpenFormFor(null);
                  await load();
                }}
              />
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="gap-1.5"
                onClick={() => setOpenFormFor(simulation.id)}
              >
                <Plus size={14} />
                {t.placeOrderButton}
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function PlaceOrderForm({
  messages,
  onCancel,
  onSubmit,
}: {
  messages: Messages["simulation"];
  onCancel: () => void;
  onSubmit: (order: {
    symbol: string;
    exchange: string;
    quantity: number;
    side: "buy" | "sell";
  }) => Promise<void>;
}) {
  const t = messages;
  const [symbol, setSymbol] = useState("");
  const [exchange, setExchange] = useState("US");
  const [quantity, setQuantity] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<SymbolResult[]>([]);
  const [searchingSymbol, setSearchingSymbol] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const trimmed = symbol.trim();
    if (!trimmed) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setSearchingSymbol(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(
          `${apiUrl}/symbols/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("Search request failed");
        const data: { results: SymbolResult[] } = await response.json();
        setSuggestions(data.results);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSearchingSymbol(false);
      }
    }, SYMBOL_SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [symbol]);

  function selectSuggestion(result: SymbolResult) {
    setSymbol(result.symbol);
    setExchange(result.exchange);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedQuantity = Number(quantity);
    if (!symbol.trim() || parsedQuantity <= 0) return;

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        symbol: symbol.trim().toUpperCase(),
        exchange,
        quantity: parsedQuantity,
        side,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">{t.formTitle}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field className="relative">
          <Label htmlFor="sim-symbol">{t.symbolLabel}</Label>
          <Input
            id="sim-symbol"
            value={symbol}
            onChange={(e) => {
              const value = e.target.value;
              setSymbol(value);
              setShowSuggestions(true);
              if (!value.trim()) setSuggestions([]);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={t.symbolPlaceholder}
            autoComplete="off"
            required
          />
          {searchingSymbol && (
            <p className="absolute top-full mt-1 text-xs text-text-tertiary">{t.symbolSearching}</p>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute top-full z-10 mt-1 flex w-full max-w-xs flex-col divide-y divide-border-subtle overflow-hidden rounded-md border border-border-default bg-surface-elevated shadow-xl shadow-black/40">
              {suggestions.map((result) => (
                <li key={`${result.exchange}-${result.symbol}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(result)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover"
                  >
                    <Badge>{result.exchange}</Badge>
                    <strong className="font-semibold text-text-primary">{result.symbol}</strong>
                    <span className="truncate text-text-secondary">{result.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>
        <Field>
          <Label htmlFor="sim-exchange">{t.exchangeLabel}</Label>
          <Select id="sim-exchange" value={exchange} onChange={(e) => setExchange(e.target.value)}>
            <option value="US">{t.exchangeUs}</option>
            {BIST_ENABLED && <option value="BIST">{t.exchangeBist}</option>}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="sim-side">{t.sideLabel}</Label>
          <Select id="sim-side" value={side} onChange={(e) => setSide(e.target.value as "buy" | "sell")}>
            <option value="buy">{t.sideBuy}</option>
            <option value="sell">{t.sideSell}</option>
          </Select>
        </Field>
        <Field>
          <Label htmlFor="sim-quantity">{t.quantityLabel}</Label>
          <Input
            id="sim-quantity"
            type="number"
            min="0"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </Field>
      </div>

      {error && <p className="text-xs text-negative">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? t.saving : t.saveButton}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t.cancelButton}
        </Button>
      </div>
    </form>
  );
}
