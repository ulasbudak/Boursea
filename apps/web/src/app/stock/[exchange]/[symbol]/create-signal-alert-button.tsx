"use client";

import { useEffect, useRef, useState } from "react";
import { Radio, Trash2 } from "lucide-react";
import type { Messages } from "@boursea/shared";
import { Button } from "@/components/ui/button";
import { Field, Label, Select } from "@/components/ui/input";
import {
  createSignalAlert,
  deleteSignalAlert,
  fetchSignalAlerts,
  fetchSignalRules,
  type SignalAlert,
  type SignalRule,
} from "@/lib/signal-alerts-client";

const TIMEFRAMES = ["intraday", "daily", "weekly", "monthly"] as const;

export function CreateSignalAlertButton({
  symbol,
  exchange,
  name,
  messages,
}: {
  symbol: string;
  exchange: string;
  name: string | null;
  messages: Messages["signalAlerts"];
}) {
  const t = messages;
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<SignalRule[] | null>(null);
  const [alerts, setAlerts] = useState<SignalAlert[] | null>(null);
  const [ruleId, setRuleId] = useState("");
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>("daily");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await fetchSignalAlerts();
      setAlerts(data.alerts.filter((a) => a.symbol === symbol && a.exchange === exchange));
    } catch {
      setAlerts([]);
    }
  }

  useEffect(() => {
    if (!open || rules !== null) return;
    let cancelled = false;

    async function initialLoad() {
      try {
        const ruleList = await fetchSignalRules();
        if (cancelled) return;
        setRules(ruleList);
        setRuleId((current) => current || ruleList[0]?.rule_id || "");
      } catch {
        if (!cancelled) setRules([]);
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, [open, rules]);

  useEffect(() => {
    if (!open || alerts !== null) return;
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await fetchSignalAlerts();
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
    if (!ruleId) return;
    setSaving(true);
    setError(null);
    try {
      await createSignalAlert({ symbol, exchange, name, rule_id: ruleId, timeframe });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(alertId: string) {
    setBusyId(alertId);
    try {
      await deleteSignalAlert(alertId);
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
        <Radio size={16} />
        {t.createButtonLabel}
      </Button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-border-default bg-surface-elevated p-3 shadow-xl shadow-black/40">
          {alerts !== null && alerts.length > 0 && (
            <div className="mb-3 border-b border-border-subtle pb-3">
              <p className="mb-2 text-xs font-medium text-text-tertiary">{t.existingForSymbol}</p>
              <ul className="flex flex-col gap-1.5">
                {alerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="flex items-center justify-between gap-2 text-sm text-text-primary"
                  >
                    <span className="truncate">{alert.rule_name}</span>
                    <span className="flex shrink-0 items-center gap-2">
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
            <Label htmlFor="signal-rule">{t.ruleLabel}</Label>
            <Select id="signal-rule" value={ruleId} onChange={(e) => setRuleId(e.target.value)}>
              {rules?.map((rule) => (
                <option key={rule.rule_id} value={rule.rule_id}>
                  {rule.rule_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field className="mb-3 gap-1.5">
            <Label htmlFor="signal-timeframe">{t.timeframeLabel}</Label>
            <Select
              id="signal-timeframe"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as (typeof TIMEFRAMES)[number])}
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf} value={tf}>
                  {tf}
                </option>
              ))}
            </Select>
          </Field>
          {error && <p className="mb-2 text-xs text-negative">{error}</p>}
          <Button
            type="button"
            className="w-full"
            disabled={saving || !ruleId}
            onClick={handleSave}
          >
            {saving ? t.saving : t.saveButton}
          </Button>
        </div>
      )}
    </div>
  );
}
