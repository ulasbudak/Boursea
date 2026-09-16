---
title: "Story 4.2: Saved Screens"
epic: "Epic 4 — Screener and Comparison"
story_id: "4.2"
status: done
created: 2026-09-16
updated: 2026-09-16
author: Bob (BMAD Scrum Master) & Amelia (BMAD Developer)
based_on: ["docs/PRD.en.md", "docs/architecture.en.md", "docs/epics.en.md §8"]
language: en
translationOf: docs/stories/story-4.2.md
depends_on: ["4.1"]
---

# Story 4.2: Saved Screens

*This is the English translation of [`docs/stories/story-4.2.md`](story-4.2.md), which remains the source of truth.*

## User Story

As an **active trader**,
I want to save my screener criteria set under a name and re-run it later,
So that I don't have to re-enter the criteria every time.

*(Source: `docs/epics.md` §8, Epic 4 — Story 4.2; PRD FR-031.)*

## Context

Story 4.1's screener form (11 fields on web, 4 on mobile) had to be filled in from scratch on every visit. This story adds a simple CRUD layer that persists a criteria set tied to the user's account — following the same pattern as Story 5.1's watchlists and Stories 5.2/5.3's alert modules: a Pydantic model + `_row_to_X` converter + `list/create/update/delete` functions + a dedicated `NotFoundError`.

**How criteria are stored:** instead of splitting `ScreenerCriteria`'s fields into separate columns, the criteria set is stored as a single `jsonb` column (`criteria`). Reason: the web and mobile forms have a different number/naming of criteria (mobile currently exposes only 4 fields in MVP scope); `jsonb` absorbs that difference without a schema change, and `/screener/run` already parses and validates criteria on its own side — a saved criteria set doesn't need backend re-validation, it's just restored as-is to repopulate the form.

## Scope

**Completed in this PR:**
- **DB:** `apps/api/migrations/0005_saved_screens.sql` — the `saved_screens` table (`id, user_id, name, criteria jsonb, created_at`), applied to live Supabase.
- **Backend:** `app/saved_screens.py` (CRUD: `list_saved_screens`, `create_saved_screen`, `update_saved_screen`, `delete_saved_screen`, `SavedScreenNotFoundError`); `GET/POST/PUT/DELETE /saved-screens` endpoints (all protected by `get_current_claims`).
- **Web:** a "Saved Screens" card on the `/screener` page — save by name, load from the list (repopulates the form), rename (`window.prompt`), delete (`window.confirm`) — consistent with the existing watchlist screen's pattern.
- **Mobile:** an equivalent card on `ScreenerScreen.tsx` — rename becomes an inline editable `TextInput` instead of web's `window.prompt` (React Native's `Alert.prompt` is iOS-only, so a cross-platform-consistent solution was chosen instead); delete happens without a confirmation prompt — identical to the existing `WatchlistScreen`'s delete behavior (no screen on mobile currently uses an `Alert.alert` confirmation).
- **i18n:** saved-screen strings added to `Messages.screener` (tr/en) — as flat fields at the same level as the existing `screener` section, not a separate nested object.

**Out of scope (deliberate):**
- Automatically re-running a saved screen on a schedule and notifying — that would overlap with Story 5.3's signal alerts as a separate feature; out of scope.
- Backend schema validation of saved criteria — `jsonb` is stored/returned as-is; since each form knows its own field names, unknown fields are simply ignored.

## Tasks

1. **[DB]** `saved_screens` schema + migration. ✅
2. **[Backend]** `app/saved_screens.py`: CRUD data layer. ✅
3. **[Backend]** `/saved-screens` GET/POST/PUT/DELETE endpoints, authenticated. ✅
4. **[Backend]** Tests: data layer (list/create/update/delete, not-found cases), endpoint tests (201/200/204/404/503/401). ✅
5. **[Web]** `lib/saved-screens-client.ts`; a save/load/rename/delete card on the `/screener` page. ✅
6. **[Mobile]** `lib/saved-screens-client.ts`; the same card on `ScreenerScreen.tsx` (inline rename). ✅
7. **[All]** Saved-screen strings added to `Messages.screener` (tr/en). ✅

## Acceptance Criteria

**AC1 — Saving**
- **Given** a screen that's been run, **When** the user clicks "Save" and enters a name, **Then** the criteria set is stored tied to the user's account (FR-031).

**AC2 — Restoring**
- **Given** the list of saved screens, **When** the user selects one, **Then** the criteria are restored; the user then presses "Run screen" to re-run it with fresh data. *(Note: restoring does not auto-run the screen — the user sees which criteria were loaded and can adjust before running, consistent with the existing screener flow of [fill form → run manually].)*

**AC3 — Delete and rename**
- **And** the user can delete or rename a saved screen.

## Definition of Done

- [x] AC1–AC3 met and verified (backend: pytest 201/201 green + ruff clean; web: typecheck/lint/build green; mobile: typecheck/lint + Metro bundle green).
- [x] Migration applied to live Supabase, verified.
- [x] **Live end-to-end verified:** with a real user JWT, `POST /saved-screens` (save a criteria set) → `GET /saved-screens` (confirmed it appears in the list) → `PUT /saved-screens/{id}` (rename, confirmed criteria unchanged) → `DELETE /saved-screens/{id}` (confirmed deleted) → confirmed an unauthenticated request returns 401.

## Technical Notes

- The `saved_screens.criteria` column is `jsonb` — written via `psycopg`'s `Json()` wrapper, and read back directly as a `dict` (no extra `json.loads` needed; `psycopg[binary]` handles this automatically).
- `update_saved_screen` only updates whichever of `name`/`criteria` is provided (via `COALESCE`) — a partial update (rename only) doesn't reset the criteria.
- Web and mobile use the same `saved_screens` table with differently-shaped `criteria` objects (11 fields on web, 4 on mobile) — this is deliberate: when a screen saved on one platform is loaded on the other, that platform's form only fills in the fields it knows about, and unknown fields are silently ignored (thanks to TypeScript's `Partial<Criteria>` spread).
