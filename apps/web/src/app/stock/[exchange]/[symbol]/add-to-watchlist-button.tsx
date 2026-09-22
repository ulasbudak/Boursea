"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bookmark, Check, Plus } from "lucide-react";
import type { Messages } from "@boursea/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addWatchlistItem,
  createWatchlist,
  fetchWatchlists,
  removeWatchlistItem,
  type Watchlist,
} from "@/lib/watchlists-client";

export function AddToWatchlistButton({
  symbol,
  exchange,
  name,
  messages,
}: {
  symbol: string;
  exchange: string;
  name: string | null;
  messages: Messages["watchlist"];
}) {
  const t = messages;
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [watchlists, setWatchlists] = useState<Watchlist[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setWatchlists(await fetchWatchlists());
    } catch {
      setWatchlists([]);
    }
  }

  useEffect(() => {
    if (!open || watchlists !== null) return;
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await fetchWatchlists();
        if (!cancelled) setWatchlists(data);
      } catch {
        if (!cancelled) setWatchlists([]);
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, [open, watchlists]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function itemFor(watchlist: Watchlist) {
    return watchlist.items.find((i) => i.symbol === symbol && i.exchange === exchange);
  }

  const memberCount = watchlists?.filter((w) => itemFor(w)).length ?? 0;

  async function toggle(watchlist: Watchlist) {
    const existing = itemFor(watchlist);
    setBusyId(watchlist.id);
    setError(null);
    try {
      if (existing) {
        await removeWatchlistItem(watchlist.id, existing.id);
      } else {
        await addWatchlistItem(watchlist.id, { symbol, exchange, name });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateAndAdd(e: FormEvent) {
    e.preventDefault();
    const listName = newListName.trim();
    if (!listName) return;
    setBusyId("__new__");
    setError(null);
    try {
      const created = await createWatchlist(listName);
      await addWatchlistItem(created.id, { symbol, exchange, name });
      setNewListName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant={memberCount > 0 ? "secondary" : "primary"}
        onClick={() => setOpen((o) => !o)}
        className="gap-1.5"
      >
        <Bookmark size={16} fill={memberCount > 0 ? "currentColor" : "none"} />
        {memberCount > 0 ? t.addedLabel : t.addButtonLabel}
      </Button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-64 rounded-lg border border-border-default bg-surface-elevated p-3 shadow-xl shadow-black/40">
          <p className="mb-2 text-xs font-medium text-text-tertiary">{t.inListsLabel}</p>

          {watchlists === null && <p className="text-xs text-text-tertiary">{t.loading}</p>}
          {watchlists !== null && watchlists.length === 0 && (
            <p className="text-xs text-text-tertiary">{t.noLists}</p>
          )}

          <ul className="flex flex-col gap-0.5">
            {watchlists?.map((watchlist) => {
              const checked = Boolean(itemFor(watchlist));
              return (
                <li key={watchlist.id}>
                  <button
                    type="button"
                    disabled={busyId === watchlist.id}
                    onClick={() => toggle(watchlist)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text-primary transition-colors hover:bg-surface-hover disabled:opacity-50"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        checked ? "border-accent bg-accent text-accent-text" : "border-border-default"
                      }`}
                    >
                      {checked && <Check size={12} />}
                    </span>
                    <span className="truncate">{watchlist.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {error && <p className="mt-2 text-xs text-negative">{error}</p>}

          <form onSubmit={handleCreateAndAdd} className="mt-2 flex gap-1.5 border-t border-border-subtle pt-2">
            <Input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder={t.newListInlineLabel}
              className="px-2 py-1 text-xs"
            />
            <Button
              type="submit"
              variant="ghost"
              disabled={busyId === "__new__" || !newListName.trim()}
              className="shrink-0 px-2"
            >
              <Plus size={14} />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
