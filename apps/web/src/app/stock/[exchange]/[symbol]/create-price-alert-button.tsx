"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Trash2 } from "lucide-react";
import type { Messages } from "@trendus/shared";
import { Button } from "@/components/ui/button";
import { Field, Label, Select, Input } from "@/components/ui/input";
import {
  createAlert,
  deleteAlert,
  fetchAlerts,
  type PriceAlert,
} from "@/lib/alerts-client";

export function CreatePriceAlertButton({
  symbol,
  exchange,
  name,
  messages,
}: {
  symbol: string;
  exchange: string;
  name: string | null;
  messages: Messages["alerts"];
}) {
  const t = messages;
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<PriceAlert[] | null>(null);
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [threshold, setThreshold] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const data = await fetchAlerts();
      setAlerts(data.alerts.filter((a) => a.symbol === symbol && a.exchange === exchange));
    } catch {
      setAlerts([]);
    }
  }

  useEffect(() => {
    if (!open || alerts !== null) return;
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await fetchAlerts();
        if (!cancelled) {
          setAlerts(data.alerts.filter((a) => a.symbol === symbol && a.exchange === exchange));
        }
      } catch {
        if (!cancelled) setAlerts([]);
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, [open, alerts, symbol, exchange]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSave() {
    const value = Number(threshold);
    if (!value || value <= 0) return;
    setSaving(true);
    try {
      await createAlert({ symbol, exchange, name, direction, threshold: value });
      setThreshold("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(alertId: string) {
    setBusyId(alertId);
    try {
      await deleteAlert(alertId);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = alerts?.filter((a) => a.status === "active").length ?? 0;

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant={activeCount > 0 ? "secondary" : "primary"}
        onClick={() => setOpen((o) => !o)}
        className="gap-1.5"
      >
        <Bell size={16} fill={activeCount > 0 ? "currentColor" : "none"} />
        {t.createButtonLabel}
      </Button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-72 rounded-lg border border-border-default bg-surface-elevated p-3 shadow-xl shadow-black/40">
          {alerts !== null && alerts.length > 0 && (
            <div className="mb-3 border-b border-border-subtle pb-3">
              <p className="mb-2 text-xs font-medium text-text-tertiary">{t.existingForSymbol}</p>
              <ul className="flex flex-col gap-1.5">
                {alerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="flex items-center justify-between gap-2 text-sm text-text-primary"
                  >
                    <span>
                      {alert.direction === "above" ? t.directionAbove : t.directionBelow}{" "}
                      {alert.threshold}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-text-tertiary">
                        {alert.status === "triggered"
                          ? t.statusTriggered
                          : alert.unavailable
                            ? t.statusUnavailable
                            : t.statusActive}
                      </span>
                      <button
                        type="button"
                        disabled={busyId === alert.id}
                        onClick={() => handleDelete(alert.id)}
                        className="text-text-tertiary transition-colors hover:text-negative disabled:opacity-50"
                        aria-label={t.deleteButton}
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              {exchange === "BIST" && (
                <p className="mt-2 text-xs text-warning">{t.bistUnavailableHint}</p>
              )}
            </div>
          )}

          <p className="mb-2 text-xs font-medium text-text-tertiary">{t.formTitle}</p>
          <Field className="mb-2 gap-1.5">
            <Label htmlFor="alert-direction">{t.directionLabel}</Label>
            <Select
              id="alert-direction"
              value={direction}
              onChange={(e) => setDirection(e.target.value as "above" | "below")}
            >
              <option value="above">{t.directionAbove}</option>
              <option value="below">{t.directionBelow}</option>
            </Select>
          </Field>
          <Field className="mb-3 gap-1.5">
            <Label htmlFor="alert-threshold">{t.thresholdLabel}</Label>
            <Input
              id="alert-threshold"
              type="number"
              min="0"
              step="0.01"
              placeholder={t.thresholdPlaceholder}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </Field>
          <Button
            type="button"
            className="w-full"
            disabled={saving || !threshold}
            onClick={handleSave}
          >
            {saving ? t.saving : t.saveButton}
          </Button>
        </div>
      )}
    </div>
  );
}
