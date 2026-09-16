---
title: "Story 4.3: Stock Comparison Table"
epic: "Epic 4 — Screener and Comparison"
story_id: "4.3"
status: done
created: 2026-09-16
updated: 2026-09-16
author: Bob (BMAD Scrum Master) & Amelia (BMAD Developer)
based_on: ["docs/PRD.en.md", "docs/architecture.en.md", "docs/epics.en.md §8"]
language: en
translationOf: docs/stories/story-4.3.md
depends_on: ["2.1", "3.5", "3.7"]
---

# Story 4.3: Stock Comparison Table

*This is the English translation of [`docs/stories/story-4.3.md`](story-4.3.md), which remains the source of truth.*

## User Story

As a **user**,
I want to compare at least 4 stocks side by side on fundamental and technical metrics,
So that I can decide which one is the better pick.

*(Source: `docs/epics.md` §8, Epic 4 — Story 4.3; PRD FR-032.)*

**Note — the gap between the AC's "2-4" and the story's "at least 4":** there's a small inconsistency in the epic document between the acceptance criteria ("add between 2 and 4 stocks") and the user story's wording ("at least 4 stocks"). The implementation follows the **acceptance criteria** (2-4, capped at 4) — this is both the epics.md's authoritative AC and a better fit for the MVP's data-provider rate-limit constraints (every comparison request makes real-time Finnhub/TwelveData calls per symbol for fundamentals+candles).

## Context

This story doesn't invent a new data source — it adds a thin orchestration layer that calls Story 2.x's fundamentals (`app/fundamentals.py`), Story 3.x's technical indicators (`app/technical.py::_rsi`), and Story 3.7's overall score (`app/scoring.py::compute_score`) functions **in parallel across multiple symbols** and merges them into a single response.

**Why `compute_score(fundamentals, candles)` is called instead of `compute_us_score(symbol)`:** `compute_us_score` fetches fundamentals and candles internally on its own. Since the comparison screen already needs to fetch both of these separately anyway to display them in the table, the raw `compute_score(fundamentals, candles)` function was used instead, to avoid fetching the same data twice (once for display, once for scoring) — this brings the per-symbol Finnhub/TwelveData call count down from 3 to 2 (fundamentals + candles, no separate "fundamentals/candles for scoring" call).

**BIST:** consistent with the architectural decision carried since Story 4.1/2.x — there's no live fundamentals/technical data source for BIST, so when a BIST symbol is added to a comparison, a placeholder `FundamentalsSnapshot` (all fields `None`) and a clear warning are returned; the symbol still appears in the table with "—" values, with no crash.

## Scope

**Completed in this PR:**
- **Backend:** `app/comparison.py` — the `ComparisonEntry` model (`symbol, exchange, fundamentals, score, rsi, warnings`), `compare_symbols(entries)` (parallel fundamentals+candles fetch for US symbols, placeholder for BIST); the `GET /compare?symbols=AAPL:US,MSFT:US` endpoint (2-4 symbol validation, `SYMBOL:EXCHANGE` format validation).
- **Web:** a new `/compare` page — symbol search+add (using the existing search box's debounce pattern), removable chips for selected symbols, a comparison table (rows for P/E, Market Cap, ROE, Debt/Equity, Net Margin, RSI, Overall Score); each row highlights the relatively best/worst value in green/red (except RSI, which uses absolute health-band coloring instead — the same `rsiTone` logic as the screener page).
- **Mobile:** a new `CompareScreen.tsx` — the same flow (search+add, chip list, metric rows), added to `HomeScreen` as a new nav card.
- **i18n:** a new `Messages.comparison` section (tr/en).

**Out of scope (deliberate):**
- Saving a comparison (a "saved comparison" feature similar to Story 4.2's saved screens) — not requested, not in the AC.
- Real comparison between BIST stocks — there's still no live data source for BIST (a consistent, recurring limitation).
- Chart/visual comparison (e.g. overlaid price charts) — the AC only asks for a "table."

## Tasks

1. **[Backend]** `app/comparison.py`: `ComparisonEntry` model, `_compare_us_symbol`, `_compare_bist_symbol`, `compare_symbols`. ✅
2. **[Backend]** `GET /compare` endpoint: `SYMBOL:EXCHANGE` format parsing, 2-4 symbol limit validation. ✅
3. **[Backend]** Tests: US symbol success/fundamentals failure/candles failure, BIST placeholder, mixed US+BIST, endpoint (400/200) tests. ✅
4. **[Web]** `/compare` page + `compare-view.tsx` (search, add/remove, table, relative best/worst highlighting); nav card on the dashboard. ✅
5. **[Mobile]** `CompareScreen.tsx`; nav card on `HomeScreen`. ✅
6. **[All]** `Messages.comparison` (tr/en). ✅

## Acceptance Criteria

**AC1 — Side-by-side comparison**
- **Given** the comparison screen, **When** the user adds between 2 and 4 stocks, **Then** the selected stocks' fundamental and technical metrics are shown side by side in a table (FR-032).

**AC2 — Visual highlighting**
- **Given** the comparison table, **When** one stock is markedly better/worse than the others on a metric, **Then** this is visually highlighted (relative best=green/worst=red for P/E, ROE, Debt/Equity, Net Margin, Overall Score; absolute health-band coloring for RSI).

**AC3 — Removing a stock**
- **And** the user can remove a stock from the comparison (removing it from the selected chip list; the table clears, and the user presses "Compare" again).

## Definition of Done

- [x] AC1–AC3 met and verified (backend: pytest 201/201 green + ruff clean; web: typecheck/lint/build green; mobile: typecheck/lint + Metro bundle green).
- [x] No crash when a BIST symbol is added to a comparison — a placeholder row with a clear warning is shown instead.
- [x] **Live end-to-end verified:** with real Finnhub/TwelveData data, `GET /compare?symbols=AAPL:US,MSFT:US` successfully returned P/E, RSI, and overall score values; a mixed `AAPL:US,THYAO:BIST` request returned 200 with a BIST warning; requests with 1 symbol and 5 symbols were both rejected with 400.

## Technical Notes

- `compare_symbols` processes US symbols in parallel via `asyncio.gather`; BIST symbols are synchronous and cheap, so they aren't parallelized separately.
- The table's relative best/worst highlighting is only applied when **at least 2 defined (non-None) values exist and they differ from each other** — if all values are equal, or only 1 symbol has data, no cell is highlighted (to avoid a false impression of a "winner").
- On web, a small, purpose-built debounced search was written inline in `compare-view.tsx` instead of reusing the existing `SearchBox` component — because the existing `SearchBox` navigates to `/stock/...` on result click (`Link`), which differs from the comparison screen's needed "add to list" behavior; code duplication was chosen over an unnecessary abstraction (changing behavior via a prop).
