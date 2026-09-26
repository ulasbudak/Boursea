"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { formatPrice, type Locale, type Messages } from "@borocean/shared";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Select } from "@/components/ui/input";
import {
  createSimulation,
  fetchSimulations,
  placeOrder,
  type Simulation,
} from "@/lib/simulations-client";

const QUICK_CREATE_BUDGET = 10_000;

/** Paper-trade the stock being viewed into one of the user's simulations (Story 10.3). */
export function SimulateBuyButton({
  symbol,
  exchange,
  name,
  price,
  currency,
  locale,
  messages,
}: {
  symbol: string;
  exchange: string;
  name: string | null;
  price: number | null;
  currency: string | null;
  locale: Locale;
  messages: Messages["simulation"];
}) {
  const t = messages;
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [simulations, setSimulations] = useState<Simulation[] | null>(null);
  const [simulationId, setSimulationId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open || simulations !== null) return;
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await fetchSimulations();
        if (cancelled) return;
        setSimulations(data.simulations);
        setSimulationId((current) => current || data.simulations[0]?.id || "");
      } catch {
        if (!cancelled) {
          setSimulations([]);
          setError(t.loadError);
        }
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, [open, simulations, t.loadError]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleQuickCreate() {
    setBusy(true);
    setError(null);
    try {
      const created = await createSimulation(t.defaultSimulationName, QUICK_CREATE_BUDGET);
      setSimulations([created]);
      setSimulationId(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleBuy() {
    const qty = Number(quantity);
    if (!simulationId || !qty || qty <= 0) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await placeOrder(simulationId, { symbol, exchange, name, quantity: qty, side: "buy" });
      // Refresh before announcing success, so the message and the new cash balance appear
      // together. A failed refresh doesn't undo the (already executed) order.
      try {
        const data = await fetchSimulations();
        setSimulations(data.simulations);
      } catch {
        // Keep showing the previous balance; the simulation page has the fresh numbers.
      }
      setSuccess(t.buySuccess.replace("{quantity}", String(qty)).replace("{symbol}", symbol));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const selected = simulations?.find((s) => s.id === simulationId) ?? null;
  const qty = Number(quantity);
  const estimate = price != null && qty > 0 ? price * qty : null;
  const money = (value: number) => formatPrice(value, currency, locale);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen((o) => !o)}
        className="gap-1.5"
      >
        <ShoppingCart size={16} />
        {t.buyFromStockButton}
      </Button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-72 rounded-lg border border-border-default bg-surface-elevated p-3 shadow-xl shadow-black/40">
          <p className="mb-2 text-xs font-medium text-text-tertiary">{t.buyFromStockTitle}</p>

          {simulations === null ? (
            <p className="text-sm text-text-tertiary">{t.loading}</p>
          ) : simulations.length === 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-text-secondary">{t.quickCreateHint}</p>
              {error && <p className="text-xs text-negative">{error}</p>}
              <Button type="button" className="w-full" disabled={busy} onClick={handleQuickCreate}>
                {t.quickCreateButton}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Field className="gap-1.5">
                <Label htmlFor="sim-buy-simulation">{t.selectSimulationLabel}</Label>
                <Select
                  id="sim-buy-simulation"
                  value={simulationId}
                  onChange={(e) => setSimulationId(e.target.value)}
                >
                  {simulations.map((simulation) => (
                    <option key={simulation.id} value={simulation.id}>
                      {simulation.name}
                    </option>
                  ))}
                </Select>
                {selected && (
                  <p className="text-xs text-text-tertiary">
                    {t.cashAvailable.replace("{amount}", money(selected.cash_balance))}
                  </p>
                )}
              </Field>
              <Field className="gap-1.5">
                <Label htmlFor="sim-buy-quantity">{t.quantityLabel}</Label>
                <Input
                  id="sim-buy-quantity"
                  type="number"
                  min="0"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                {estimate != null && (
                  <p className="text-xs text-text-tertiary">
                    {t.estimatedCost.replace("{amount}", money(estimate))}
                  </p>
                )}
              </Field>
              <p className="text-xs text-text-tertiary">{t.realTimeExecutionNote}</p>
              {error && <p className="text-xs text-negative">{error}</p>}
              {success && (
                <p role="status" className="text-xs text-positive">
                  {success}{" "}
                  <Link href="/simulation" className="underline">
                    {t.goToSimulation}
                  </Link>
                </p>
              )}
              <Button
                type="button"
                className="w-full"
                disabled={busy || !simulationId || !(qty > 0)}
                onClick={handleBuy}
              >
                {busy ? t.buying : t.buyButton}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
