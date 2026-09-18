"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatPrice, formatSignedPercent, type Locale, type Messages } from "@trendus/shared";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Label, Select } from "@/components/ui/input";
import { Badge, ChangeValue } from "@/components/ui/change-value";
import {
  addTransaction,
  createPortfolio,
  deletePortfolio,
  deletePosition,
  fetchPortfolios,
  type Portfolio,
} from "@/lib/portfolios-client";

export function PortfolioView({
  messages,
  locale,
}: {
  messages: Messages["portfolio"];
  locale: Locale;
}) {
  const t = messages;
  const [portfolios, setPortfolios] = useState<Portfolio[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [creating, setCreating] = useState(false);
  const [openFormFor, setOpenFormFor] = useState<string | null>(null);

  async function load() {
    try {
      const data = await fetchPortfolios();
      setPortfolios(data.portfolios);
      setWarnings(data.warnings);
      setError(null);
    } catch {
      setError(t.loadError);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await fetchPortfolios();
        if (!cancelled) {
          setPortfolios(data.portfolios);
          setWarnings(data.warnings);
          setError(null);
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
    const name = newPortfolioName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await createPortfolio(name);
      setNewPortfolioName("");
      await load();
    } catch {
      setError(t.loadError);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeletePortfolio(id: string) {
    if (!window.confirm(t.deletePortfolioConfirm)) return;
    setPortfolios((prev) => prev?.filter((p) => p.id !== id) ?? null);
    try {
      await deletePortfolio(id);
    } catch {
      await load();
    }
  }

  async function handleDeletePosition(portfolioId: string, positionId: string) {
    setPortfolios(
      (prev) =>
        prev?.map((p) =>
          p.id === portfolioId
            ? { ...p, positions: p.positions.filter((pos) => pos.id !== positionId) }
            : p
        ) ?? null
    );
    try {
      await deletePosition(portfolioId, positionId);
    } catch {
      await load();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            value={newPortfolioName}
            onChange={(e) => setNewPortfolioName(e.target.value)}
            placeholder={t.newPortfolioPlaceholder}
          />
          <Button
            type="submit"
            disabled={creating || !newPortfolioName.trim()}
            className="shrink-0 gap-1.5"
          >
            <Plus size={16} />
            {t.createPortfolioButton}
          </Button>
        </form>
      </Card>

      {error && <p className="text-sm text-negative">{error}</p>}
      {warnings.map((warning) => (
        <p key={warning} className="text-xs text-warning">
          {warning}
        </p>
      ))}

      {portfolios === null && !error && <p className="text-sm text-text-tertiary">{t.loading}</p>}

      {portfolios !== null && portfolios.length === 0 && (
        <Card className="text-center">
          <p className="text-sm text-text-secondary">{t.noPortfolios}</p>
          <p className="mt-1 text-xs text-text-tertiary">{t.noPortfoliosHint}</p>
        </Card>
      )}

      {portfolios?.map((portfolio) => (
        <Card key={portfolio.id}>
          <CardHeader>
            <div>
              <CardTitle>{portfolio.name}</CardTitle>
              <div className="mt-1 flex items-center gap-3 text-sm">
                <span className="text-text-tertiary">
                  {t.totalValueLabel}: <span className="tabular-nums text-text-primary">{formatPrice(portfolio.total_market_value, "USD", locale)}</span>
                </span>
                {portfolio.total_pnl_pct !== null && (
                  <ChangeValue value={portfolio.total_pnl_abs}>
                    {formatPrice(portfolio.total_pnl_abs, "USD", locale)} (
                    {formatSignedPercent(portfolio.total_pnl_pct, locale)})
                  </ChangeValue>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDeletePortfolio(portfolio.id)}
              aria-label={t.deletePortfolioButton}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-text-tertiary transition-colors hover:bg-negative/10 hover:text-negative"
            >
              <Trash2 size={14} />
              {t.deletePortfolioButton}
            </button>
          </CardHeader>

          {portfolio.positions.length === 0 ? (
            <p className="text-sm text-text-tertiary">{t.emptyPortfolio}</p>
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
                    <th className="px-3 py-2 text-right font-medium">{t.columnPnl}</th>
                    <th className="py-2 pl-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {portfolio.positions.map((position) => (
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
                        {position.price_unavailable && position.exchange === "BIST" && (
                          <p className="mt-0.5 text-xs text-text-tertiary">{t.bistUnavailableHint}</p>
                        )}
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
                      <td className="px-3 py-2.5 text-right">
                        {position.pnl_abs !== null && position.pnl_pct !== null ? (
                          <ChangeValue value={position.pnl_abs}>
                            {formatPrice(position.pnl_abs, "USD", locale)} (
                            {formatSignedPercent(position.pnl_pct, locale)})
                          </ChangeValue>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <button
                          type="button"
                          aria-label={t.deletePositionButton}
                          onClick={() => handleDeletePosition(portfolio.id, position.id)}
                          className="rounded-full p-1 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-negative"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 border-t border-border-subtle pt-4">
            {openFormFor === portfolio.id ? (
              <AddTransactionForm
                messages={t}
                onCancel={() => setOpenFormFor(null)}
                onSubmit={async (transaction) => {
                  await addTransaction(portfolio.id, transaction);
                  setOpenFormFor(null);
                  await load();
                }}
              />
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="gap-1.5"
                onClick={() => setOpenFormFor(portfolio.id)}
              >
                <Plus size={14} />
                {t.addTransactionButton}
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function AddTransactionForm({
  messages,
  onCancel,
  onSubmit,
}: {
  messages: Messages["portfolio"];
  onCancel: () => void;
  onSubmit: (transaction: {
    symbol: string;
    exchange: string;
    name?: string | null;
    quantity: number;
    price: number;
    side: "buy" | "sell";
  }) => Promise<void>;
}) {
  const t = messages;
  const [symbol, setSymbol] = useState("");
  const [exchange, setExchange] = useState("US");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(price);
    if (!symbol.trim() || parsedQuantity <= 0 || parsedPrice <= 0) return;

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        symbol: symbol.trim().toUpperCase(),
        exchange,
        quantity: parsedQuantity,
        price: parsedPrice,
        side,
      });
    } catch {
      setError(t.loadError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">{t.formTitle}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Field>
          <Label htmlFor="symbol">{t.symbolLabel}</Label>
          <Input
            id="symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder={t.symbolPlaceholder}
            required
          />
        </Field>
        <Field>
          <Label htmlFor="exchange">{t.exchangeLabel}</Label>
          <Select id="exchange" value={exchange} onChange={(e) => setExchange(e.target.value)}>
            <option value="US">{t.exchangeUs}</option>
            <option value="BIST">{t.exchangeBist}</option>
          </Select>
        </Field>
        <Field>
          <Label htmlFor="side">{t.sideLabel}</Label>
          <Select id="side" value={side} onChange={(e) => setSide(e.target.value as "buy" | "sell")}>
            <option value="buy">{t.sideBuy}</option>
            <option value="sell">{t.sideSell}</option>
          </Select>
        </Field>
        <Field>
          <Label htmlFor="quantity">{t.quantityLabel}</Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </Field>
        <Field>
          <Label htmlFor="price">{t.priceLabel}</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
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
