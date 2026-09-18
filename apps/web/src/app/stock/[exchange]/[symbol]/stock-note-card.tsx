"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import type { Messages } from "@trendus/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteNote, fetchNote, saveNote } from "@/lib/notes-client";

export function StockNoteCard({
  symbol,
  exchange,
  messages,
}: {
  symbol: string;
  exchange: string;
  messages: Messages["notes"];
}) {
  const t = messages;
  const [note, setNote] = useState("");
  const [hasSavedNote, setHasSavedNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const existing = await fetchNote(symbol, exchange);
        if (!cancelled && existing) {
          setNote(existing.note);
          setHasSavedNote(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, [symbol, exchange]);

  async function handleSave() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await saveNote(symbol, exchange, note.trim());
      setHasSavedNote(true);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await deleteNote(symbol, exchange);
      setNote("");
      setHasSavedNote(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <Card>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">{t.title}</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t.placeholder}
        rows={3}
        className="w-full resize-none rounded-md border border-border-default bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" onClick={handleSave} disabled={saving || !note.trim()}>
          {saving ? t.saving : t.saveButton}
        </Button>
        {hasSavedNote && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-text-tertiary transition-colors hover:bg-negative/10 hover:text-negative"
          >
            <Trash2 size={14} />
            {t.deleteButton}
          </button>
        )}
        {justSaved && <span className="text-xs text-positive">{t.savedLabel}</span>}
      </div>
    </Card>
  );
}
