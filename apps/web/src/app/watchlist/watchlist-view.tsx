"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { Messages } from "@trendus/shared";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/change-value";
import {
  createWatchlist,
  deleteWatchlist,
  fetchWatchlists,
  removeWatchlistItem,
  type Watchlist,
} from "@/lib/watchlists-client";

export function WatchlistView({ messages }: { messages: Messages["watchlist"] }) {
  const t = messages;
  const [watchlists, setWatchlists] = useState<Watchlist[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      setWatchlists(await fetchWatchlists());
      setError(null);
    } catch {
      setError(t.loadError);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await fetchWatchlists();
        if (!cancelled) {
          setWatchlists(data);
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
    const name = newListName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await createWatchlist(name);
      setNewListName("");
      await load();
    } catch {
      setError(t.loadError);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteList(id: string) {
    if (!window.confirm(t.deleteListConfirm)) return;
    setWatchlists((prev) => prev?.filter((w) => w.id !== id) ?? null);
    try {
      await deleteWatchlist(id);
    } catch {
      await load();
    }
  }

  async function handleRemoveItem(watchlistId: string, itemId: string) {
    setWatchlists(
      (prev) =>
        prev?.map((w) =>
          w.id === watchlistId ? { ...w, items: w.items.filter((i) => i.id !== itemId) } : w
        ) ?? null
    );
    try {
      await removeWatchlistItem(watchlistId, itemId);
    } catch {
      await load();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder={t.newListPlaceholder}
          />
          <Button type="submit" disabled={creating || !newListName.trim()} className="shrink-0 gap-1.5">
            <Plus size={16} />
            {t.createListButton}
          </Button>
        </form>
      </Card>

      {error && (
        <p role="alert" className="rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
          {error}
        </p>
      )}

      {watchlists === null && !error && <p className="text-sm text-text-tertiary">{t.loading}</p>}

      {watchlists !== null && watchlists.length === 0 && (
        <Card className="text-center">
          <p className="text-sm text-text-secondary">{t.noLists}</p>
          <p className="mt-1 text-xs text-text-tertiary">{t.noListsHint}</p>
        </Card>
      )}

      {watchlists?.map((watchlist) => (
        <Card key={watchlist.id}>
          <CardHeader>
            <CardTitle>{watchlist.name}</CardTitle>
            <button
              type="button"
              onClick={() => handleDeleteList(watchlist.id)}
              aria-label={t.deleteListButton}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-text-tertiary transition-colors hover:bg-negative/10 hover:text-negative"
            >
              <Trash2 size={14} />
              {t.deleteListButton}
            </button>
          </CardHeader>

          {watchlist.items.length === 0 ? (
            <p className="text-sm text-text-tertiary">{t.emptyList}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border-subtle">
              {watchlist.items.map((item) => (
                <li key={item.id} className="flex items-center gap-2 py-2.5 text-sm">
                  <Badge>{item.exchange}</Badge>
                  <Link
                    href={`/stock/${item.exchange}/${item.symbol}`}
                    className="font-semibold text-text-primary hover:text-accent"
                  >
                    {item.symbol}
                  </Link>
                  <span className="truncate text-text-secondary">{item.name}</span>
                  <button
                    type="button"
                    aria-label={t.removeItemButton}
                    onClick={() => handleRemoveItem(watchlist.id, item.id)}
                    className="ml-auto rounded-full p-1 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-negative"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
