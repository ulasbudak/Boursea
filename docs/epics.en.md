---
title: "Boursea (Stock Tracking App) - Epic & Story Backlog"
status: draft
created: 2026-09-15
updated: 2026-09-16
author: Bob (BMAD Scrum Master)
inputDocuments: ["docs/PRD.md", "docs/architecture.md"]
language: en
translationOf: docs/epics.md
---

# Boursea — Epic & Story Backlog

*This is the English translation of [`docs/epics.md`](epics.md), which remains the source of truth. If the two ever disagree, the Turkish version wins until this file is re-synced.*

## 1. Overview

Based on `docs/PRD.md` and `docs/architecture.md`, this document splits the Phase 1 (MVP) functional requirements into user-value-focused epics and stories that can each be completed in a single developer session. Since a UX design document (`bmad-ux`) has not been produced yet, this backlog is based on the PRD + Architecture; UX-DR (UX Design Requirement) lines should be added to the relevant epics once a UX spec is prepared.

## 2. Requirements Inventory

### 2.1 Functional Requirements (Phase 1 / MVP scope)

FR-001, FR-002, FR-003, FR-010, FR-011, FR-013, FR-020, FR-021, FR-022, FR-023, FR-024, FR-030, FR-031, FR-032, FR-040, FR-041, FR-042, FR-043, FR-050, FR-051, FR-052, FR-060, FR-061, FR-062, FR-070, FR-080, FR-081, FR-082, FR-083, FR-090, FR-091

*(See `docs/PRD.md` Section 5 for the full text.)*

### 2.2 Phase 2 — Out of This Backlog's Scope

FR-012 (customizable metric weighting), FR-025/FR-102 (ML-based signal/pattern recognition), FR-033 (screen notifications), FR-053 (portfolio risk analysis), FR-063 (advanced personalization), FR-071 (SMS notifications). Per PRD Section 8, these requirements are deferred to Phase 2 and are not addressed in Epics 1–8 below.

**Exception — Epic 9:** FR-100 (AI stock commentary) and FR-101 (deterministic chart pattern recognition), while technically Phase 2 scope, were included in this backlog as Epic 9 because the user flagged them as the **first priority** after the MVP (Epic 1–8) (see §13 and `docs/product-brief-epic9-ai.md`).

### 2.3 Non-Functional Requirements (reflected in the relevant stories' acceptance criteria)

NFR-1 Performance (search <1s, real-time data within a few seconds), NFR-2 Reliability (99.5%+ uptime, no silent failures), NFR-3 Data Accuracy/Disclaimer, NFR-4 Security (encrypted data, JWT), NFR-5 Scalability, NFR-6 Cross-Platform Consistency, NFR-7 Legal/Compliance.

### 2.4 Additional Requirements from the Architecture

- Monorepo skeleton: `apps/web` (Next.js), `apps/mobile` (React Native/Expo), `apps/api` (FastAPI) — see `architecture.md` §12.
- Backend OpenAPI schema → frontend type-generation pipeline (AD-2).
- Supabase Auth integration and a JWT verification middleware (AD-3).
- The market-data-provider adapter interface (`MarketDataProvider`) — AD-5.
- A Redis-pub/sub-based WebSocket gateway (AD-4).
- Scheduled jobs via Celery + a Redis broker (AD-8).
- RevenueCat webhook integration, an entitlement cache (AD-7).
- TradingView Lightweight Charts integration — native on web, WebView on mobile (AD-9).
- Sentry error tracking, CI/CD (GitHub Actions → Vercel/Railway/EAS).

## 3. FR Coverage Map

| FR | Epic |
|---|---|
| FR-060, FR-090, FR-091, FR-001, FR-002 | Epic 1 |
| FR-010, FR-011, FR-013 | Epic 2 |
| FR-020, FR-021, FR-022, FR-023, FR-024, FR-003 | Epic 3 |
| FR-030, FR-031, FR-032 | Epic 4 |
| FR-040, FR-041, FR-042, FR-043, FR-070 | Epic 5 |
| FR-050, FR-051, FR-052 | Epic 6 |
| FR-061, FR-062 | Epic 7 |
| FR-080, FR-081, FR-082, FR-083 | Epic 8 |

## 4. Epic List

### Epic 1: Authentication, Stock Discovery, and Core Infrastructure
Users can register and log in, use the app in their preferred language, and search US (NYSE/NASDAQ) and BIST stocks to see a basic overview. This epic also lays the technical foundation (monorepo, backend/frontend skeleton, auth) that every later epic builds on.
**FRs covered:** FR-060, FR-090, FR-091, FR-001, FR-002

### Epic 2: Fundamental Analysis
Users can see world-standard fundamental analysis metrics for their selected stock and its position relative to the sector average.
**FRs covered:** FR-010, FR-011, FR-013

### Epic 3: Technical Analysis and the Summary Evaluation Score
Users can use a broad indicator library on an interactive chart, see rule-based automatic signals, and see a summary evaluation score derived from a combination of the stock's fundamental and technical data.
**FRs covered:** FR-020, FR-021, FR-022, FR-023, FR-024, FR-003

### Epic 4: Screener and Comparison
Users can run stock screens by combining fundamental and technical criteria, save screens, and compare multiple stocks side by side.
**FRs covered:** FR-030, FR-031, FR-032

### Epic 5: Watchlist, Alerts, and Notifications
Users can add stocks to a watchlist, set price/indicator-based alerts, and receive a push/email notification when an alert fires.
**FRs covered:** FR-040, FR-041, FR-042, FR-043, FR-070

### Epic 6: Portfolio Tracking
Users can add their stocks to a portfolio and track live value and profit/loss across multiple portfolios.
**FRs covered:** FR-050, FR-051, FR-052

### Epic 7: Personalization
Users can see stocks surfaced based on their interests and add personal notes to stocks they follow.
**FRs covered:** FR-061, FR-062

### Epic 8: Subscription and Monetization (Freemium)
Users can see the limits of the free tier and upgrade to premium for real-time data/the broader feature set.
**FRs covered:** FR-080, FR-081, FR-082, FR-083

### Epic 9: AI-Assisted Commentary and Pattern Detection (Phase 2 — First Priority Post-MVP)
Users can read a free-form AI commentary grounded in current news on the stock detail page, and see automatically detected trend/support-resistance/formation findings on the price chart. Does not start until Epic 1–8 (Phase 1 MVP) is complete.
**FRs covered:** FR-100, FR-101 (FR-102/FR-025 is a later sub-phase of this epic, to be handled separately)

**Epic-independence note:** Each epic may use the output of an earlier one (e.g. Epic 3 uses the fundamental data model produced by Epic 2), but no epic waits on a later epic to be finished. Epic 8 (Subscription) places freemium gates behind the feature boundaries produced by Epics 1–7, but does not change those epics' functionality.

---

## 5. Epic 1: Authentication, Stock Discovery, and Core Infrastructure

### Story 1.1: Project Skeleton and Core Infrastructure Setup ✅ Done

> See **`docs/stories/story-1.md`** for detailed, dev-ready acceptance criteria — this first story lays the technical foundation the project needs before development can begin.

Short summary: sets up the monorepo (`apps/web`, `apps/mobile`, `apps/api`), the Next.js/FastAPI/Expo skeletons, the Supabase project connection, a basic CI pipeline, and environment-variable management.

### Story 1.2: User Registration and Login ✅ Done

> See **`docs/stories/story-1.2.md`** for detailed acceptance criteria and the task breakdown. Backend (JWKS-based JWT verification + `/me`), web (email/password + Google/Apple OAuth via `@supabase/ssr`, `/dashboard`), and mobile (email/password sign-up/login) were implemented and verified. Native Google/Apple OAuth on mobile was deliberately left out of scope (see the story file — it needs an EAS dev client and real provider credentials).

As a **new user**,
I want to sign up and log in with my email or a Google/Apple account,
So that I can save my personal watchlist, portfolio, and preferences.

**Acceptance Criteria:**

- **Given** an unregistered visitor, **When** they fill out and submit the sign-up form with email and password, **Then** an account is created in Supabase Auth and the user is redirected in a logged-in state.
- **Given** a registered user, **When** they log in with Google or Apple, **Then** the OAuth flow completes and is matched to their existing account.
- **Given** invalid credentials, **When** the user tries to log in, **Then** a clear error message is shown and the account is not locked.
- **And** the session JWT is verified by backend middleware on every API request (NFR-4); an invalid/expired token is rejected with 401.

### Story 1.3: Language Selection and Localization Foundation

- [x] **Done** — See **`docs/stories/story-1.3.md`** for detailed acceptance criteria and the task breakdown. Translation/formatting logic was moved into a shared i18n module under `packages/shared`; web (`Accept-Language` + cookie + a `/settings` page) and mobile (`expo-localization` + `AsyncStorage` + a new `SettingsScreen`) were implemented and verified. The language preference is persisted via Supabase `user_metadata`, without adding a new backend table.

As a **user**,
I want to choose the app's language as Turkish or English,
So that I can comfortably use the app in my own language.

**Acceptance Criteria:**

- **Given** the first launch, **When** the device/browser language is Turkish or English, **Then** the app opens in that language; for an unsupported language, English is the default.
- **Given** the settings screen, **When** the user changes the language, **Then** all UI text instantly switches to the selected language and the preference is saved persistently (FR-090).
- **And** number/currency formats (thousands separator, TRY/USD display) automatically adapt to the selected language and market (FR-091).

### Story 1.4: Stock Search

- [x] **Done** — See **`docs/stories/story-1.4.md`** for detailed acceptance criteria and the task breakdown. Backend (the `market_data` module: a static symbol directory for BIST + live Finnhub search for the US, `GET /symbols/search`), web (a search box on `/dashboard`), and mobile (search on `HomeScreen`) were implemented and verified.

As a **user**,
I want to search US and BIST stocks by symbol or company name,
So that I can quickly find the stock I'm interested in.

**Acceptance Criteria:**

- **Given** a search box, **When** the user types a symbol or company name, **Then** matching results are listed with an exchange label (NASDAQ/NYSE/BIST) in under 1 second (NFR-1).
- **Given** a partial/misspelled query, **When** the user searches, **Then** the closest matching symbols/company names are suggested.
- **Given** no matches, **When** the search completes, **Then** the "no results" state is shown clearly to the user.

### Story 1.5: Stock Overview Card

- [x] **Done** — See **`docs/stories/story-1.5.md`** for detailed acceptance criteria and the task breakdown. Backend (`GET /symbols/overview`: Finnhub `/quote` + `/stock/profile2` for the US, the static directory + a "data currently unavailable" warning for BIST), web (the `/stock/[exchange]/[symbol]` page, wired to search results), and mobile (`StockOverviewScreen`, tapping a search result) were implemented and verified.

As a **user**,
I want to see the current price, daily change, market cap, and company info when I open a stock,
So that I can quickly form a first impression of the stock.

**Acceptance Criteria:**

- **Given** a stock detail page, **When** the page loads, **Then** the current price, daily change (% and absolute), market cap, sector, and industry are shown.
- **Given** the market data provider is temporarily unreachable, **When** data can't be fetched, **Then** a "data currently unavailable" warning is shown instead of a silent failure (NFR-2).
- **And** a "not investment advice" notice appears as a fixed element somewhere on the page (NFR-3, NFR-7).

---

## 6. Epic 2: Fundamental Analysis

### Story 2.1: Fundamental Metrics Display

- [x] **Done** — See **`docs/stories/story-2.1.md`** for detailed acceptance criteria, the architectural approach, and the task breakdown. Backend (a new `fundamentals` module: Finnhub `/stock/metric` for the US, a "no data" + warning for BIST; `GET /fundamentals`), web ("Overview"/"Fundamentals" tabs on the stock detail page), and mobile (the same tabs on `StockOverviewScreen`) were implemented and verified.

As a **user**,
I want to see a stock's fundamental metrics like P/E, P/B, ROE, ROA, EPS, dividend yield, debt-to-equity, and profit margin,
So that I can assess the stock's financial health.

**Acceptance Criteria:**

- **Given** the "Fundamentals" tab on a stock detail page, **When** the user opens the tab, **Then** all metrics listed in PRD FR-010 are shown with their current values.
- **Given** data is unavailable for a metric, **When** the page renders, **Then** the metric is marked "no data" and the page does not crash.
- **And** metric values are shown from the normalized data model returned by the backend `fundamentals` module (consistent with architecture AD-5).

### Story 2.2: Sector Comparison

- [x] **Done** — See **`docs/stories/story-2.2.md`** for detailed acceptance criteria, the architectural approach, and the task breakdown. Backend (`sector_comparison` was added to the `GET /fundamentals` response: peer companies via Finnhub `/stock/peers`, an average of their metrics fetched in parallel, and a `%` difference), web and mobile (a sector average + difference shown on every metric row in the Fundamentals tab) were implemented and verified.

As a **user**,
I want to see each metric compared against the sector/index average,
So that I can understand whether the stock is cheap or expensive relative to its sector.

**Acceptance Criteria:**

- **Given** the fundamental metrics list, **When** each metric is shown, **Then** the sector average and the stock's position relative to it (above/below, % difference) are shown next to it (FR-011).
- **Given** the stock's sector info is missing, **When** the comparison can't be computed, **Then** the comparison field shows "no sector data."

### Story 2.3: Historical Financial Performance Chart

- [x] **Done** — See **`docs/stories/story-2.3.md`** for detailed acceptance criteria, the architectural approach, and the task breakdown. Backend (a new `GET /fundamentals/history`: per-share revenue/net income/EPS from the `series` section of the Finnhub `/stock/metric` response), web and mobile (a dependency-free bar-chart section with an annual/quarterly toggle added to the "Fundamentals" tab) were implemented and verified. Epic 2 (Fundamental Analysis) is complete as of this story.

As a **user**,
I want to see the company's last 5 years/20 quarters of revenue, net income, and EPS as a chart,
So that I can assess the company's financial trend over time.

**Acceptance Criteria:**

- **Given** the fundamental analysis tab on a stock detail page, **When** the user reaches the "Historical Performance" section, **Then** the last 5 years (annual) and last 20 quarters (quarterly) of revenue/net income/EPS are shown as a chart (FR-013).
- **And** the user can switch between the annual and quarterly views.

---

## 7. Epic 3: Technical Analysis and the Summary Evaluation Score

### Story 3.1: Interactive Price Chart

- [x] **Done** — See **`docs/stories/story-3.1.md`** for detailed acceptance criteria, the architectural approach, and the task breakdown. AD-9 was implemented for the first time: backend (a new `GET /symbols/candles`: Finnhub `/stock/candle`, with `intraday`/`daily`/`weekly`/`monthly` timeframes), web (`lightweight-charts` v5, native), mobile (the same charting engine via a `react-native-webview` bridge) — a "Technical Analysis" tab was added to the stock detail page. Implemented and verified.

As a **user**,
I want to switch between candlestick/line/bar chart types and inspect the price chart across different timeframes,
So that I can analyze price action however I like.

**Acceptance Criteria:**

- **Given** the "Technical Analysis" tab on a stock detail page, **When** the user opens the tab, **Then** a candlestick chart is shown by default via TradingView Lightweight Charts (AD-9).
- **Given** the chart toolbar, **When** the user changes the chart type (candlestick/line/bar) or the timeframe (intraday/daily/weekly/monthly), **Then** the chart updates instantly (FR-020).
- **And** the chart works with the same data contract on both web and mobile (via a WebView bridge on mobile).

### Story 3.2: Core Chart Indicators

- [x] **Done** — See **`docs/stories/story-3.2.md`** for detailed acceptance criteria and the task breakdown. Indicator-computation logic (`packages/shared/src/indicators`) was added as pure TS functions; web and mobile use `lightweight-charts` v5's overlay/pane API to show SMA/EMA/Bollinger on the price panel and RSI/MACD/Stochastic/Volume in separate panels; each indicator can be added/removed with a single click. Implemented and verified.

As a **user**,
I want to add core indicators like SMA/EMA, RSI, MACD, Bollinger Bands, Volume, and Stochastic to the chart,
So that I can perform basic technical analysis.

**Acceptance Criteria:**

- **Given** the chart's indicator menu, **When** the user selects a core indicator, **Then** the indicator is added to the chart as an overlay/sub-panel (FR-021).
- **Given** multiple indicators are added, **When** the user views the chart, **Then** all indicators are shown together legibly.
- **And** the user can remove an added indicator with a single click.

### Story 3.3: Extended Indicator Library

- [x] **Done** — See **`docs/stories/story-3.3.md`** for detailed acceptance criteria and the task breakdown. 32 advanced indicators (`packages/shared/src/indicators/advanced`) plus Story 3.2's 7 core indicators were merged into a single `ALL_INDICATORS` registry; web and mobile offer a searchable "Advanced" list, period customization, and one-click add/remove. Implemented and verified.

As an **active trader**,
I want access to advanced indicators like ADX, Fibonacci Retracement, Ichimoku, ATR, OBV, Parabolic SAR, and Williams %R,
So that I can perform deeper technical analysis.

**Acceptance Criteria:**

- **Given** the indicator library menu, **When** the user opens the "Advanced" category, **Then** at least 30 indicators are presented in a searchable list (FR-022).
- **Given** an indicator is selected, **When** it's added with default parameters (e.g. period), **Then** the user can customize the parameters.

### Story 3.4: Manual Drawing Tools

- [x] **Done** — See **`docs/stories/story-3.4.md`** for detailed acceptance criteria and the task breakdown. A trend line (2 points) and a horizontal support/resistance line can be added via chart clicks and are persisted per symbol+exchange in client-side storage (web: `localStorage`, mobile: `AsyncStorage`); active drawings can be selected from a list and deleted. Implemented and verified.

As an **active trader**,
I want to draw a trend line and a horizontal support/resistance line on the chart,
So that I can mark up my own analysis on the chart.

**Acceptance Criteria:**

- **Given** the chart's drawing toolbar, **When** the user selects the trend-line tool and marks two points on the chart, **Then** the line is added to the chart and persisted (FR-023).
- **Given** the horizontal-line tool, **When** the user clicks a price level, **Then** a horizontal support/resistance line is added at that level.
- **And** the user can select and delete a drawing they've added.

### Story 3.5: Rule-Based Automatic Signal Generation

- [x] **Done** — See **`docs/stories/story-3.5.md`** for detailed acceptance criteria, the architectural approach, and the task breakdown. A new backend `technical` module (RSI/SMA/EMA/MACD were ported to Python; 6 rules: RSI oversold/overbought, MACD crossover, Golden/Death Cross); `GET /symbols/signals` generates a signal history on-request from historical data (no Celery/DB — see the story's architectural rationale). A "Signals" list was added to the Technical Analysis tab on web and mobile. Implemented and verified.

As an **active trader**,
I want to see signals automatically generated from built-in rules like RSI/MACD/moving-average crossovers,
So that I can spot potential opportunities without manual screening.

**Acceptance Criteria:**

- **Given** a stock's technical data updates, **When** one of the defined rules is satisfied (e.g. "RSI dropped below 30"), **Then** the backend `technical` module produces a signal record and shows it on the stock detail page (FR-024).
- **Given** a signal list, **When** the user looks at a stock's signal history, **Then** the last N signals are listed with their trigger date.
- **And** signal generation is rule-based/deterministic; ML-based scoring is not part of this story's scope (see PRD FR-025, Phase 2).

### Story 3.6: Summary Evaluation Score

- [x] **Done** — See **`docs/stories/story-3.6.md`** for detailed acceptance criteria, the scoring model, and the task breakdown. A new backend `app/scoring.py`: rule-based scoring combining fundamentals (P/E, ROE, debt-to-equity, net margin, EPS growth — 50pt) and technicals (trend, RSI, the last 90 days' signal tendency — 50pt); `GET /symbols/score`. A score badge + factor breakdown (an expandable info panel) was added to the "Overview" tab on web and mobile; shows "not enough data" when data is insufficient. **Epic 3 and the Phase 1/MVP scope of PRD Epics 1–3 are complete as of this story.**

As a **new/amateur investor**,
I want to see a simple score/label that summarizes a stock's overall condition without digging into complex metrics,
So that I can quickly answer "is this stock worth looking at?"

**Acceptance Criteria:**

- **Given** a stock has both fundamental (Epic 2) and technical (Story 3.1–3.5) data available, **When** the stock overview card loads, **Then** a score from 1–100 or a Buy/Neutral/Sell label is shown (FR-003).
- **Given** fundamental or technical data is missing, **When** the score can't be computed, **Then** a "not enough data" state is shown — no incorrect/random score is displayed.
- **And** a score explanation ("what is this score based on") is presented to the user via a tooltip.

> **Note:** The scoring weights were updated by Story 3.7 (see below) — these ACs/DoD are still valid, only the factor composition was expanded.

### Story 3.7: Advanced Buy/Sell Recommendation Engine

- [x] **Done** — See **`docs/stories/story-3.7.md`** for detailed acceptance criteria and the task breakdown. At the user's request, Story 3.5/3.6 was strengthened (without standing up new backend infrastructure): 6 new rules were added to `app/technical.py` (Bollinger breakout, Stochastic extreme-zone crossover, a short SMA20/50 crossover — 12 rules total); a "Technical Consensus" factor (25/100, the single largest factor in the score) that measures the current direction of 6 indicators, plus a template-based, deterministic `rationale` sentence, were added to `app/scoring.py`. A rationale text + consensus ratio display was added to the score badge on web/mobile.

As a **user**,
I want the summary score to show not just a number but also how many indicators point which direction and a readable rationale for it,
So that I can understand how much to trust a "buy/sell recommendation" and what it's based on.

**Acceptance Criteria:**

- **Given** a stock's historical technical data, **When** a Bollinger breakout, a Stochastic extreme-zone crossover, or an SMA20/50 crossover has occurred historically, **Then** these 6 new rule types also appear in the signal list (Story 3.5).
- **Given** the summary score is being computed, **When** the score response returns, **Then** it includes a consensus ratio showing how many of the 6 technical indicators currently point bullish/bearish/neutral.
- **And** the score response includes a deterministic rationale sentence — naming the strongest contributing factor and the consensus ratio, with a "not investment advice" reminder.

---

## 8. Epic 4: Screener and Comparison

### Story 4.1: Multi-Criteria Screener

- [x] **Done** — See **`docs/stories/story-4.1.md`** for detailed acceptance criteria and the task breakdown. Backend (`GET /screener/run`: a screening engine that combines fundamental+technical criteria, with an in-process cache), web (a `/screener` page), and mobile (`ScreenerScreen`) were implemented and verified. End-to-end verification with a live Finnhub key should be done by the user.

As an **active trader**,
I want to run a stock screen by combining criteria like market cap, P/E, RSI, volume, sector, and exchange,
So that I can quickly find stocks matching my investment criteria.

**Acceptance Criteria:**

- **Given** the screener screen, **When** the user sets multiple fundamental+technical criteria together, **Then** all stocks matching every criterion are listed in a table (FR-030).
- **Given** no stock matches the criteria, **When** the screen is run, **Then** a "no results" state is shown.
- **And** screen results cover both US and BIST stocks according to the exchange filter.

### Story 4.2: Saved Screens

- [x] **Done** — See **`docs/stories/story-4.2.en.md`** for detailed acceptance criteria and the task breakdown. Backend (a `saved_screens` table + `GET/POST/PUT/DELETE /saved-screens`, criteria stored as `jsonb`), web (a save/load/rename/delete card on the `/screener` page), and mobile (the same functionality on `ScreenerScreen`, with inline rename) were implemented and verified. Live end-to-end verified against Supabase.

As an **active trader**,
I want to save my screening criteria set under a name and re-run it,
So that I don't have to re-enter the criteria every time.

**Acceptance Criteria:**

- **Given** a screen the user has built, **When** they click "Save" and enter a name, **Then** the criteria set is stored against their account (FR-031).
- **Given** the saved-screens list, **When** the user selects one, **Then** the criteria are restored and the screen re-runs against current data.
- **And** the user can delete or rename a saved screen.

### Story 4.3: Stock Comparison Table

- [x] **Done** — See **`docs/stories/story-4.3.en.md`** for detailed acceptance criteria and the task breakdown. Backend (`app/comparison.py` + `GET /compare`: parallel fundamentals+technical+score aggregation for 2-4 symbols, with a placeholder for BIST), web (a `/compare` page with search+add/remove and relative best/worst coloring), and mobile (`CompareScreen`) were implemented and verified. Live end-to-end verified against real Finnhub/TwelveData data.

As a **user**,
I want to compare at least 4 stocks side by side on fundamental and technical metrics,
So that I can decide which is the better choice.

**Acceptance Criteria:**

- **Given** the comparison screen, **When** the user adds 2–4 stocks, **Then** the selected stocks' fundamental and technical metrics are shown side by side in a table (FR-032).
- **Given** the comparison table, **When** one stock is noticeably better/worse than the others on a metric, **Then** this is visually highlighted (e.g. color coding).
- **And** the user can remove a stock from the comparison.

---

## 9. Epic 5: Watchlist, Alerts, and Notifications

### Story 5.1: Watchlist Creation and Management

- [x] **Done** — See **`docs/stories/story-5.1.md`** for detailed acceptance criteria and the task breakdown. DB (the `watchlists`/`watchlist_items` migration was applied to live Supabase), backend (`app/watchlists.py` + `/watchlists` endpoints — the project's first authenticated write operations), web (a `/watchlist` page + an add/remove popover on the stock detail page), and mobile (`WatchlistScreen`, `AddToWatchlistButton`) were implemented and verified. Visual verification on a real browser/device is left to the user (no browser/simulator automation tool was available in this environment).

As a **user**,
I want to add stocks I want to follow to one or more watchlists,
So that I can track the stocks I care about from one place.

**Acceptance Criteria:**

- **Given** a stock detail page, **When** the user taps "Add to watchlist" and picks a list, **Then** the stock is added to that list (FR-040).
- **Given** multiple watchlists, **When** the user creates a new list, **Then** they can name it and distribute stocks across their lists.
- **And** the user can remove a stock from a watchlist.

### Story 5.2: Price Alert Creation

- [x] **Done** — See **`docs/stories/story-5.2.md`** for detailed acceptance criteria and the task breakdown. Backend (`app/alerts.py` + the `price_alerts` table + `/alerts` endpoints — US alerts are evaluated live against Finnhub on every `GET /alerts` call), web (a `/alerts` page + a "Set Price Alert" button on the stock detail page), and mobile (`AlertsScreen`, `CreatePriceAlertButton`) were implemented. **Live end-to-end verified against real Supabase + Finnhub** (see the story file — unlike later stories, real credentials happened to be available in this environment). BIST alerts can be created, but since there's no live BIST price feed, their trigger status is explicitly marked "unavailable" (no silent wrong state).

As a **user**,
I want to set a price-threshold alert for a stock,
So that I'm notified when the price reaches a level I've set.

**Acceptance Criteria:**

- **Given** a stock detail page, **When** the user sets a "notify me if price rises above/falls below X" alert, **Then** the alert is stored in the backend `alerts` module (FR-041).
- **Given** an active price alert, **When** the market price crosses the threshold, **Then** the alert triggers once and its status updates to "triggered."
- **And** the user can list and delete their active alerts.

### Story 5.3: Indicator/Signal Alert Creation

- [x] **Done** — See **`docs/stories/story-5.3.md`** for detailed acceptance criteria and the task breakdown. Backend (a catalog of the 12 rules added to `app/technical.py` + `app/signal_alerts.py` + the `signal_alerts` table + `/signal-alerts` and `GET /technical/rules` endpoints — the Story 3.5 signal engine was reused, not modified), web (a "Set Signal Alert" button on the stock detail page + a `/signal-alerts` page), and mobile (`SignalAlertsScreen`, `CreateSignalAlertButton`) were implemented. **Live end-to-end verified against real Supabase + Finnhub** (RSI was computed on real AAPL daily candles and the rule genuinely triggered). BIST is marked "unavailable" for the same reason as Story 5.2.

As an **active trader**,
I want to set an alert based on an indicator condition like RSI/MACD,
So that I don't miss technical signals without manually watching them.

**Acceptance Criteria:**

- **Given** a stock detail page, **When** the user picks a rule like "notify me if RSI rises above 70," **Then** the alert is saved (FR-042).
- **Given** an active indicator alert, **When** the Story 3.5 signal engine triggers the relevant condition, **Then** the alert fires.

### Story 5.4: Alert Notifications — Push and Email

- [x] **Done** — See **`docs/stories/story-5.4.en.md`** for detailed acceptance criteria and the task breakdown. Backend (`app/notifications.py` + the `user_notification_settings` table + `/notification-settings` endpoints; the moment an alert triggers, `evaluate_and_persist` attempts an Expo push/Resend email send), web (an email-notification card on `/settings`), and mobile (a push+email card on `SettingsScreen`, with a permission/token flow via `expo-notifications`) were implemented. **Live-verified at the push-send-request level**; actual delivery to a real device could not be tested in this environment since Expo Go dropped remote push support in SDK 53+ (an EAS dev client is required — the same category of limitation as the native OAuth gap in Story 1.2, rationale in the story file). **Epic 5 is complete as of this story.**

As a **user**,
I want to get a push notification and/or email when an alert triggers,
So that I'm notified without keeping the app open.

**Acceptance Criteria:**

- **Given** a triggered alert, **When** the user has the mobile app installed, **Then** an instant notification is sent via Expo Push (FR-043, FR-070).
- **Given** the user has left email notifications on, **When** an alert triggers, **Then** an email is sent via Resend.
- **And** the user can change their notification preferences (push/email/both) from settings.

---

## 10. Epic 6: Portfolio Tracking

### Story 6.1: Portfolio Creation and Position Entry

As a **user**,
I want to add the stocks I own to my portfolio with quantity and cost price,
So that I can track my real investments through the app.

**Acceptance Criteria:**

- **Given** the portfolio screen, **When** the user enters a quantity and cost price for a stock, **Then** the position is added to the portfolio (FR-050).
- **Given** an existing position, **When** the user enters an additional buy/sell, **Then** the average cost is recomputed.
- **And** the user can delete a position.

### Story 6.2: Portfolio Value and Profit/Loss Computation

As a **user**,
I want to see my portfolio's live total value and my per-position profit/loss,
So that I can track my investment performance.

**Acceptance Criteria:**

- **Given** the portfolio screen, **When** current prices change, **Then** the total portfolio value and each position's profit/loss (in TRY/USD and %) update (FR-051).
- **Given** a position's current price can't be fetched, **When** the computation runs, **Then** that position is marked "data unavailable" and the total is not shown incorrectly.

### Story 6.3: Multiple Portfolio Support

As a **user**,
I want to create multiple portfolios (e.g. "US stocks," "BIST long-term"),
So that I can track different investment strategies separately.

**Acceptance Criteria:**

- **Given** the portfolio management screen, **When** the user creates a new portfolio, **Then** a separate portfolio opens under the chosen name (FR-052).
- **Given** multiple portfolios, **When** the user switches between them, **Then** each portfolio's own positions and total are shown separately.

---

## 11. Epic 7: Personalization

### Story 7.1: Interest Profile and Highlights

As a **user**,
I want to tag the sectors/stocks I'm interested in,
So that I can see relevant highlighted stocks on the home screen.

**Acceptance Criteria:**

- **Given** profile settings, **When** the user selects sectors of interest, **Then** the preference is saved (FR-061).
- **Given** a saved interest profile, **When** the user opens the home screen, **Then** stocks surfaced by rule (e.g. today's top movers) from the selected sectors are shown.

### Story 7.2: Adding a Personal Note to a Stock

As a **user**,
I want to add my own note to a stock I follow,
So that I can remember my thoughts/decisions about it.

**Acceptance Criteria:**

- **Given** a stock detail page, **When** the user types a note and saves it, **Then** the note is stored privately for that user (FR-062).
- **Given** a previously added note, **When** the user reopens the page, **Then** they see the note and can edit/delete it.

---

## 12. Epic 8: Subscription and Monetization (Freemium)

### Story 8.1: Enforcing the Free/Premium Tier Split

As a **free-tier user**,
I want to clearly see which features are free and which are premium,
So that I know what I'll get before upgrading.

**Acceptance Criteria:**

- **Given** a user on the free tier, **When** they try to access a premium feature (e.g. real-time data, the broad indicator library, unlimited screening/alerts), **Then** the feature is shown locked and an upgrade offer appears (FR-080, FR-081, FR-082).
- **Given** the free tier, **When** the user looks at price data, **Then** it's clearly labeled as delayed/daily.
- **And** access control is always resolved from the backend's cached entitlement state; the client can never self-report "I'm premium" (AD-7).

### Story 8.2: Premium Subscription Purchase and Management

As a **user**,
I want to subscribe to premium and manage my subscription from within the app,
So that I can access real-time data and advanced features.

**Acceptance Criteria:**

- **Given** the upgrade screen, **When** the user picks a plan and completes the purchase (App Store/Play Store IAP or Stripe on web), **Then** the entitlement is updated via RevenueCat and the user gets premium access instantly (FR-083).
- **Given** an active subscription, **When** the user cancels, **Then** premium access continues until the end of the current period, then reverts to the free tier.
- **And** the subscription status (plan, renewal date) is shown on the settings screen.

---

## 13. Epic 9: AI-Assisted Commentary and Pattern Detection

> **Prerequisite:** Epic 1–8 (Phase 1 MVP) must be complete. See `docs/product-brief-epic9-ai.md` for the decision rationale, the alternatives evaluated and rejected, and the open risk.

### Story 9.1: Free-Form AI Stock Commentary

As a **(premium) user**,
I want to read an AI commentary grounded in current news about a stock on its detail page,
So that I can quickly understand the stock's current context without just looking at numbers.

**Acceptance Criteria:**

- **Given** a premium user opens a stock detail page, **When** they reach the "AI Commentary" section, **Then** a free-form commentary is shown, generated (RAG) grounded in Finnhub `company-news` data and the app's own fundamental/technical data (FR-100).
- **Given** a free-tier user, **When** they reach the same section, **Then** the feature is shown locked with a premium upgrade offer (FR-080).
- **Given** no current news is found for the stock, **When** commentary generation is attempted, **Then** a "not enough current data" state is shown; no generic commentary carrying hallucination risk is produced without news.
- **And** a fixed "not investment advice" notice and the news source/date (for transparency) appear below the commentary (NFR-3, NFR-7).

### Story 9.2: Deterministic Chart Pattern Detection

As an **active trader**,
I want to see trend lines, support/resistance levels, and classic formations automatically detected on the price chart,
So that I can quickly spot important levels/patterns on the chart without drawing them manually.

**Acceptance Criteria:**

- **Given** a stock's technical data, **When** the rule-based pattern-recognition algorithm runs, **Then** detected trend lines/support-resistance levels and classic formations (triangle, head-and-shoulders, etc.) are marked on the chart (FR-101).
- **Given** a finding is listed, **When** the user looks at it, **Then** it's presented as a "pattern/signal finding," in language consistent with the existing signal engine (FR-024); no "AI trading strategy" or "recommendation" language is used.
- **Given** there isn't enough data / no clear pattern, **When** detection runs, **Then** a "no clear pattern detected" state is shown — no forced/incorrect finding is produced.
- **And** this story's output is rule-based/deterministic; an ML model trained on historical data (FR-102/FR-025) is out of this epic's scope and will be handled in a separate future phase.

---

## 14. Next Steps

1. This backlog should be reviewed by the user to confirm epic ordering/story scope.
2. `docs/stories/story-1.md` (Epic 1, Story 1.1) is ready as the first development step — development can start there.
3. As each story completes, this document's status should be updated, or a `sprint-status.yaml` tracking file should be generated via `bmad-sprint-planning`.
4. Once the UX design (`bmad-ux`) is done, UX-DR lines should be added to the relevant epics.
5. For Epic 9 (AI Commentary): confirm whether the Finnhub `company-news` endpoint is included at the current subscription tier; the LLM provider/cost choice and the regulatory open question (PRD §9) must be resolved before Epic 9 development starts.
