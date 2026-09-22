"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import type { Messages } from "@boursea/shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/change-value";
import {
  deleteSignalAlert,
  fetchSignalAlerts,
  type SignalAlert,
} from "@/lib/signal-alerts-client";

export function SignalAlertsView({ messages }: { messages: Messages["signalAlerts"] }) {
  const t = messages;
  const [alerts, setAlerts] = useState<SignalAlert[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await fetchSignalAlerts();
      setAlerts(data.alerts);
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
        const data = await fetchSignalAlerts();
        if (!cancelled) {
          setAlerts(data.alerts);
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

  async function handleDelete(id: string) {
    setAlerts((prev) => prev?.filter((a) => a.id !== id) ?? null);
    try {
      await deleteSignalAlert(id);
    } catch {
      await load();
    }
  }

  function statusLabel(alert: SignalAlert): string {
    if (alert.status === "triggered") return t.statusTriggered;
    if (alert.unavailable) return t.statusUnavailable;
    return t.statusActive;
  }

  return (
    <div className="flex flex-col gap-4">
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

      {alerts === null && !error && <p className="text-sm text-text-tertiary">{t.loading}</p>}

      {alerts !== null && alerts.length === 0 && (
        <Card className="text-center">
          <p className="text-sm text-text-secondary">{t.emptyList}</p>
        </Card>
      )}

      {alerts !== null && alerts.length > 0 && (
        <Card>
          <ul className="flex flex-col divide-y divide-border-subtle">
            {alerts.map((alert) => (
              <li key={alert.id} className="flex flex-col gap-1 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge>{alert.exchange}</Badge>
                  <Link
                    href={`/stock/${alert.exchange}/${alert.symbol}`}
                    className="font-semibold text-text-primary hover:text-accent"
                  >
                    {alert.symbol}
                  </Link>
                  <span className="truncate text-text-secondary">{alert.rule_name}</span>
                  <span
                    className={`ml-auto shrink-0 text-xs font-medium ${
                      alert.status === "triggered" ? "text-positive" : "text-text-tertiary"
                    }`}
                  >
                    {statusLabel(alert)}
                  </span>
                  <button
                    type="button"
                    aria-label={t.deleteButton}
                    onClick={() => handleDelete(alert.id)}
                    className="rounded-full p-1 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-negative"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {alert.unavailable && alert.exchange === "BIST" && (
                  <p className="text-xs text-text-tertiary">{t.bistUnavailableHint}</p>
                )}
                {alert.unavailable && alert.exchange === "US" && (
                  <p className="text-xs text-text-tertiary">{t.usUnavailableHint}</p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
