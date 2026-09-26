---
title: "Borocean (Stock Tracking App) - Epic & Story Backlog"
status: active
created: 2026-09-15
updated: 2026-09-26
author: Bob (BMAD Scrum Master)
inputDocuments: ["docs/PRD.md", "docs/architecture.md"]
language: en
translationOf: docs/epics.md
---

# Borocean — Epic & Story Backlog

*This is the English translation of [`docs/epics.md`](epics.md), which remains the source of truth. If the two ever disagree, the Turkish version wins until this file is re-synced. Last re-synced: 2026-09-26.*

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
| FR-100, FR-101 | Epic 9 |
| FR-110, FR-111, FR-112 | Epic 10 |
| FR-120 – FR-126 | Epic 11 |

## 4. Epic List

### Epic 1: Authentication, Stock Discovery, and Core Infrastructure
Users can sign up and log in, use the app in their preferred language, search US (NYSE/NASDAQ) and BIST stocks, and see basic overview information. This epic also lays the technical foundation (monorepo, backend/frontend skeleton, auth) that every later epic builds on.
**FRs covered:** FR-060, FR-090, FR-091, FR-001, FR-002

### Epic 2: Fundamental Analysis
Users can see world-standard fundamental analysis metrics for a chosen stock and where it stands against its sector average.
**FRs covered:** FR-010, FR-011, FR-013

### Epic 3: Technical Analysis and Summary Rating Score
Users can use a broad indicator library on an interactive chart, see rule-based automatic signals, and see a summary rating score derived from the stock's combined fundamental + technical data.
**FRs covered:** FR-020, FR-021, FR-022, FR-023, FR-024, FR-003

### Epic 4: Screener and Comparison
Users can screen stocks by combining fundamental and technical criteria, save screens, and compare several stocks side by side.
**FRs covered:** FR-030, FR-031, FR-032

### Epic 5: Watchlist, Alerts, and Notifications
Users can add stocks to watchlists, set price/indicator-based alerts, and receive push/email notifications when alerts trigger.
**FRs covered:** FR-040, FR-041, FR-042, FR-043, FR-070

### Epic 6: Portfolio Tracking
Users can add stocks they own to a portfolio and track live value and profit/loss across multiple portfolios.
**FRs covered:** FR-050, FR-051, FR-052

### Epic 7: Personalization
Users can see highlighted stocks based on their interests and add personal notes to stocks they follow.
**FRs covered:** FR-061, FR-062

### Epic 8: Subscription and Monetization (Freemium)
Users can see the limits of the free tier and upgrade to premium to access real-time data and the broader feature set.
**FRs covered:** FR-080, FR-081, FR-082, FR-083

### Epic 9: AI-Assisted Commentary and Pattern Detection (Phase 2 — First Priority Post-MVP)
Users can read a free-form AI commentary grounded in current data on the stock detail page and see trend/support-resistance/formation findings automatically detected on the price chart. Does not start until Epic 1–8 (Phase 1 MVP) is complete.
**FRs covered:** FR-100, FR-101 (FR-102/FR-025 is a later sub-phase of this epic, handled separately)

### Epic 10: Trading Simulation (Paper Trading)
Users can create a simulation with a virtual budget, buy and sell US stocks at the current real price, and see the simulation's daily value and profit/loss history. There is no real money or brokerage connection (PRD §10).
**FRs covered:** FR-110, FR-111, FR-112

### Epic 11: Cryptocurrency Market (Backlog — not started)
Users can search crypto assets and see price, chart and market information on a detail page; they can use them in watchlists, alerts, portfolios, simulations and screening through the same flows as stocks. Data, analysis and virtual trading only — no real crypto trading or wallet connection.
**FRs covered:** FR-120, FR-121, FR-122, FR-123, FR-124, FR-125, FR-126

**Epic independence note:** Each epic may use the output of an earlier one (e.g. Epic 3 uses the fundamental data model produced by Epic 2), but no epic waits on a later epic to be completed. Epic 8 (Subscription) places the feature limits produced in Epic 1–7 behind freemium gates but does not change those epics' functionality.

---

## 5. Epic 1: Authentication, Stock Discovery, and Core Infrastructure

### Story 1.1: Project Skeleton and Core Infrastructure Setup ✅ Done

> For detailed, development-ready acceptance criteria see **`docs/stories/story-1.md`** — this first story lays the technical foundation the project needs to start development.

Short summary: the monorepo (`apps/web`, `apps/mobile`, `apps/api`), Next.js/FastAPI/Expo skeletons, the Supabase project connection, a basic CI pipeline, and environment-variable management are set up.

### Story 1.2: User Sign-Up and Login ✅ Done

> For detailed acceptance criteria and the task breakdown see **`docs/stories/story-1.2.md`**. Backend (JWKS-based JWT verification + `/me`), web (email/password + Google/Apple OAuth via `@supabase/ssr`, `/dashboard`) and mobile (email/password sign-up/login) were implemented and verified. Native Google/Apple OAuth on mobile was deliberately left out of scope (see the story file — it needs an EAS dev-client and real provider credentials).

As a **new user**,
I want to sign up and log in with my email or my Google/Apple account,
So that I can save my personal watchlist, portfolio, and preferences.

**Acceptance Criteria:**

- **Given** an unregistered visitor, **When** they fill in and submit the sign-up form with an email and password, **Then** an account is created in Supabase Auth and the user is redirected as signed in.
- **Given** a registered user, **When** they log in with Google or Apple, **Then** the OAuth flow completes and is matched to their existing account.
- **Given** invalid credentials, **When** the user tries to log in, **Then** a clear error message is shown and the account is not locked.
- **And** the session JWT is verified by the backend middleware on every API request (NFR-4); an invalid/expired token is rejected with 401.

### Story 1.3: Language Selection and Localization Foundation

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-1.3.md`**. Translation/formatting logic was moved into a shared i18n module under `packages/shared`; web (`Accept-Language` + cookie + a `/settings` page) and mobile (`expo-localization` + `AsyncStorage` + a new `SettingsScreen`) were implemented and verified. The language preference is persisted through Supabase `user_metadata`, without adding a new backend table.

As a **user**,
I want to choose Turkish or English as the app language,
So that I can use the app comfortably in my own language.

**Acceptance Criteria:**

- **Given** the first launch, **When** the user's device/browser language is Turkish or English, **Then** the app opens in that language; for an unsupported language English is the default.
- **Given** the settings screen, **When** the user changes the language, **Then** all UI text switches to the selected language immediately and the preference is saved persistently (FR-090).
- **And** number/currency formats (thousands separator, TRY/USD display) adapt automatically to the selected language and market (FR-091).

### Story 1.4: Stock Search

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-1.4.md`**. Backend (`market_data` module: a static symbol index for BIST + Finnhub live search for the US, `GET /symbols/search`), web (the `/dashboard` search box) and mobile (`HomeScreen` search) were implemented and verified.

As a **user**,
I want to search US and BIST stocks by symbol or company name,
So that I can quickly find the stock I'm interested in.

**Acceptance Criteria:**

- **Given** the search box, **When** the user types a symbol or company name, **Then** matching results are listed with their exchange label (NASDAQ/NYSE/BIST) in under 1 second (NFR-1).
- **Given** a partial/misspelled query, **When** the user searches, **Then** the closest matching symbols/company names are suggested.
- **Given** no results, **When** the search completes, **Then** a clear "no results found" state is shown to the user.

### Story 1.5: Stock Overview Card

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-1.5.md`**. Backend (`GET /symbols/overview`: Finnhub `/quote` + `/stock/profile2` for the US, the static index + a "data can't be updated right now" warning for BIST), web (the `/stock/[exchange]/[symbol]` page, wired to search results) and mobile (`StockOverviewScreen`, tapping a search result) were implemented and verified.

As a **user**,
I want to see the current price, daily change, market cap, and company information when I open a stock,
So that I can get a quick first impression of the stock.

**Acceptance Criteria:**

- **Given** a stock detail page, **When** the page loads, **Then** the current price, daily change (% and absolute), market cap, sector, and industry are shown.
- **Given** the market data provider is temporarily unreachable, **When** data can't be fetched, **Then** a "data can't be updated right now" warning is shown instead of a silent failure (NFR-2).
- **And** a "not investment advice" notice is permanently present somewhere on the page (NFR-3, NFR-7).

### Story 1.6: Temporarily Disabling BIST

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-1.6.md`**. User request (2026-09-26): since there is no live BIST price source, BIST was removed from search/screening, hidden from selection lists, and labeled "currently disabled" in the app. It can be turned back on with a single flag (`BIST_ENABLED`, API + `@borocean/shared`). The same work fixed Finnhub search returning foreign listings (`AAPL.TO`, `GARAN.E.IS`…) labeled as "US".

### Story 1.7: Inline Sign-In Errors, Email-Confirmation Notice, and Password Reset

- [x] **Done (documented retroactively)** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-1.7.md`**. The code shipped on 2026-09-26 in commit `5e29760` without a story document. Sign-in/sign-up errors are shown inline on the form and translated (`authErrorKey`, web + mobile); since "Confirm email" is on in production, a "verify your email" screen is shown after sign-up; the web gained a `/forgot-password` → `/reset-password` flow and a designed `/error` page. **Still open:** mobile has no password reset or verification screen.

---

## 6. Epic 2: Fundamental Analysis

### Story 2.1: Displaying Fundamental Metrics

- [x] **Done** — For detailed acceptance criteria, the architectural approach and the task breakdown see **`docs/stories/story-2.1.md`**. Backend (a new `fundamentals` module: Finnhub `/stock/metric` for the US, "no data" + a warning for BIST; `GET /fundamentals`), web ("Overview"/"Fundamentals" tabs on the stock detail page) and mobile (the same tabs on `StockOverviewScreen`) were implemented and verified.

As a **user**,
I want to see a stock's fundamental metrics such as P/E, P/B, ROE, ROA, EPS, dividend yield, debt-to-equity, and profit margin,
So that I can assess the stock's financial health.

**Acceptance Criteria:**

- **Given** the "Fundamentals" tab of the stock detail page, **When** the user opens the tab, **Then** every metric listed in PRD FR-010 is shown with its current value.
- **Given** no data is available for a metric, **When** the page renders, **Then** the metric is marked "no data" and the page does not crash.
- **And** metric values are shown according to the normalized data model coming from the backend `fundamentals` module (consistent with architecture AD-5).

### Story 2.2: Sector Comparison

- [x] **Done** — For detailed acceptance criteria, the architectural approach and the task breakdown see **`docs/stories/story-2.2.md`**. Backend (`sector_comparison` added to the `GET /fundamentals` response: peer companies via Finnhub `/stock/peers`, the average of their metrics fetched in parallel, and the `%` difference), web and mobile (sector average + difference on every metric row in the Fundamentals tab) were implemented and verified.

As a **user**,
I want to see each metric compared against its sector/index average,
So that I can understand whether the stock is cheap or expensive relative to its sector.

**Acceptance Criteria:**

- **Given** the fundamental metric list, **When** each metric is shown, **Then** the sector average and the stock's position relative to it (above/below, % difference) are shown next to it (FR-011).
- **Given** the stock's sector information is missing, **When** the comparison can't be computed, **Then** the comparison field is shown as "no sector data."

### Story 2.3: Historical Financial Performance Chart

- [x] **Done** — For detailed acceptance criteria, the architectural approach and the task breakdown see **`docs/stories/story-2.3.md`**. Backend (a new `GET /fundamentals/history`: per-stock revenue/net income/EPS from the `series` section of Finnhub's `/stock/metric` response), web and mobile (a dependency-free bar-chart section with an annual/quarterly toggle in the "Fundamentals" tab) were implemented and verified. Epic 2 (Fundamental Analysis) was completed with this story.

As a **user**,
I want to see a chart of the company's revenue, net income, and EPS for the last 5 years/20 quarters,
So that I can assess the company's financial trend over time.

**Acceptance Criteria:**

- **Given** the fundamentals tab of the stock detail page, **When** the user reaches the "Historical Performance" section, **Then** revenue/net income/EPS for the last 5 years (annual) and the last 20 quarters (quarterly) are shown as a chart (FR-013).
- **And** the user can switch between the annual and quarterly views.

---

## 7. Epic 3: Technical Analysis and Summary Rating Score

### Story 3.1: Interactive Price Chart

- [x] **Done** — For detailed acceptance criteria, the architectural approach and the task breakdown see **`docs/stories/story-3.1.md`**. AD-9 was brought to life for the first time: backend (a new `GET /symbols/candles`: Finnhub `/stock/candle`, `intraday`/`daily`/`weekly`/`monthly` timeframes), web (`lightweight-charts` v5, native), mobile (the same charting engine over a `react-native-webview` bridge) — a "Technical Analysis" tab was added to the stock detail page. Implemented and verified.

As a **user**,
I want to switch between candlestick/line/bar chart types and inspect the price chart across different timeframes,
So that I can analyze price action the way I want.

**Acceptance Criteria:**

- **Given** the "Technical Analysis" tab of the stock detail page, **When** the user opens the tab, **Then** a candlestick chart is shown by default using TradingView Lightweight Charts (AD-9).
- **Given** the chart toolbar, **When** the user changes the chart type (candlestick/line/bar) or timeframe (intraday/daily/weekly/monthly), **Then** the chart updates immediately (FR-020).
- **And** the chart works with the same data contract on both web and mobile (over a WebView bridge on mobile).

### Story 3.2: Core Indicators

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-3.2.md`**. Indicator computation logic (`packages/shared/src/indicators`) was added as pure TS functions; using `lightweight-charts` v5's overlay/pane API, web and mobile show SMA/EMA/Bollinger on the price pane and RSI/MACD/Stochastic/Volume in separate panes; each indicator can be added and removed with one click. Implemented and verified.

As a **user**,
I want to add core indicators such as SMA/EMA, RSI, MACD, Bollinger Bands, Volume, and Stochastic to the chart,
So that I can do basic technical analysis.

**Acceptance Criteria:**

- **Given** the chart's indicator menu, **When** the user selects a core indicator, **Then** the indicator is added to the chart as an overlay/sub-pane (FR-021).
- **Given** several indicators have been added, **When** the user views the chart, **Then** all indicators are shown together legibly.
- **And** the user can remove an added indicator with one click.

### Story 3.3: Broad Indicator Library

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-3.3.md`**. 32 advanced indicators (`packages/shared/src/indicators/advanced`) + Story 3.2's 7 core indicators were merged into a single `ALL_INDICATORS` registry; web and mobile have a searchable "Advanced" list + period customization + one-click add/remove. Implemented and verified.

As an **active trader**,
I want access to advanced indicators such as ADX, Fibonacci Retracement, Ichimoku, ATR, OBV, Parabolic SAR, and Williams %R,
So that I can do more in-depth technical analysis.

**Acceptance Criteria:**

- **Given** the indicator library menu, **When** the user opens the "Advanced" category, **Then** at least 30 indicators are offered as a searchable list (FR-022).
- **Given** an indicator is selected, **When** it is added with default parameters (e.g. period), **Then** the user can customize the parameters.

### Story 3.4: Manual Drawing Tools

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-3.4.md`**. Trend lines (2 points) and horizontal support/resistance lines are added by clicking on the chart and persisted in client-side storage keyed by symbol+exchange (web: `localStorage`, mobile: `AsyncStorage`); active drawings can be selected from a list and deleted. Implemented and verified.

As an **active trader**,
I want to draw trend lines and horizontal support/resistance lines on the chart,
So that I can mark my own analysis on the chart.

**Acceptance Criteria:**

- **Given** the chart drawing toolbar, **When** the user selects the trend line tool and marks two points on the chart, **Then** the line is added to the chart and saved persistently (FR-023).
- **Given** the horizontal line tool, **When** the user clicks a price level, **Then** a horizontal support/resistance line is added at that level.
- **And** the user can select and delete a drawing they added.

### Story 3.5: Rule-Based Automatic Signal Generation

- [x] **Done** — For detailed acceptance criteria, the architectural approach and the task breakdown see **`docs/stories/story-3.5.md`**. A new backend `technical` module (RSI/SMA/EMA/MACD ported to Python; 6 rules: RSI oversold/overbought, MACD crossover, Golden/Death Cross); `GET /symbols/signals` produces a signal history from historical data at request time (without Celery/a DB — see the architectural rationale in the story). A "Signals" list was added to the Technical Analysis tab on web and mobile. Implemented and verified.

As an **active trader**,
I want to see signals generated automatically from built-in rules such as RSI/MACD/moving-average crossovers,
So that I can spot potential opportunities without manual screening.

**Acceptance Criteria:**

- **Given** a stock's technical data is updated, **When** one of the defined rules (e.g. "RSI dropped below 30") is met, **Then** the backend `technical` module produces a signal record and it is shown on the stock detail page (FR-024).
- **Given** the signal list, **When** the user looks at a stock's signal history, **Then** the last N signals are listed with their trigger dates.
- **And** signal generation is rule-based/deterministic; ML-based scoring is not in this story's scope (see PRD FR-025, Phase 2).

### Story 3.6: Summary Rating Score

- [x] **Done** — For detailed acceptance criteria, the scoring model and the task breakdown see **`docs/stories/story-3.6.md`**. A new backend `app/scoring.py`: rule-based scoring from fundamentals (P/E, ROE, debt-to-equity, net margin, EPS growth — 50 pts) + technicals (trend, RSI, the signal tendency of the last 90 days — 50 pts); `GET /symbols/score`. A score badge + factor breakdown (an expandable info panel) was added to the "Overview" tab on web and mobile; with insufficient data it shows "not enough data." **Epic 3, and the Epic 1–3 part of the PRD's Phase 1/MVP, were completed with this story.**

As a **new/amateur investor**,
I want to see a simple score/label summarizing the stock's overall condition without digging into complex metrics,
So that I can quickly answer "is this stock worth a look?"

**Acceptance Criteria:**

- **Given** both fundamental (Epic 2) and technical (Story 3.1–3.5) data are available for a stock, **When** the stock overview card loads, **Then** a 1–100 score or a Buy/Neutral/Sell label is shown (FR-003).
- **Given** fundamental or technical data is missing, **When** the score can't be computed, **Then** a "not enough data" state is shown; a wrong/random score is never shown.
- **And** an explanation of the score ("what this score is based on") is offered to the user via a tooltip.

> **Note:** The scoring weights were updated by Story 3.7 (see below) — these ACs/DoD still apply; only the factor composition was extended.

### Story 3.7: Advanced Buy/Sell Recommendation Engine

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-3.7.md`**. At the user's request Stories 3.5/3.6 were strengthened (without new backend infrastructure): 6 new rules in `app/technical.py` (Bollinger breakout, Stochastic overbought/oversold crossover, short SMA20/50 crossover — 12 rules in total); a "Technical Consensus" factor in `app/scoring.py` that measures the current direction of 6 indicators (25/100, the score's largest single factor) and a template-based, deterministic `rationale` sentence. The score badge on web/mobile gained the rationale text + the consensus ratio.

As a **user**,
I want the summary score to be not just a number but also show how many indicators point in which direction, with a readable rationale,
So that I can understand how far to trust the "buy/sell recommendation" and what it is based on.

**Acceptance Criteria:**

- **Given** a stock's historical technical data, **When** a Bollinger breakout, a Stochastic overbought/oversold crossover or an SMA20/50 crossover has occurred in the past, **Then** these 6 new rule types also appear in the signal list (Story 3.5).
- **Given** the summary score is being computed, **When** the score response returns, **Then** it includes a consensus ratio showing how many of the 6 technical indicators are currently bullish/bearish/neutral.
- **And** the score response includes a deterministic rationale sentence with the strongest contributing factor and the consensus ratio, plus a "not investment advice" reminder.

---

## 8. Epic 4: Screener and Comparison

### Story 4.1: Multi-Criteria Screening

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-4.1.md`**. Backend (`GET /screener/run`: a screening engine combining fundamental + technical criteria, with an in-process cache), web (the `/screener` page) and mobile (`ScreenerScreen`) were implemented and verified. Live end-to-end verification was done on 2026-09-18 with real Finnhub/Twelve Data keys.

As an **active trader**,
I want to screen stocks by combining criteria such as market cap, P/E, RSI, volume, sector, and exchange,
So that I can quickly find stocks that match my investment criteria.

**Acceptance Criteria:**

- **Given** the screener screen, **When** the user sets several fundamental + technical criteria together, **Then** the stocks matching all criteria are listed in a table (FR-030).
- **Given** no stock matches the criteria, **When** the screen runs, **Then** a "no results found" state is shown.
- **And** screening results cover both US and BIST stocks according to the exchange filter.

### Story 4.2: Saved Screens

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-4.2.md`**. Backend (a `saved_screens` table + `GET/POST/PUT/DELETE /saved-screens`, criteria stored as `jsonb`), web (a save/load/rename/delete card on the `/screener` page) and mobile (the same functionality in `ScreenerScreen`, with inline renaming) were implemented and verified. Verified end-to-end against live Supabase.

As an **active trader**,
I want to save my screening criteria set under a name and re-run it,
So that I don't have to re-enter the criteria every time.

**Acceptance Criteria:**

- **Given** a configured screen, **When** the user clicks "Save" and enters a name, **Then** the criteria set is stored against the user's account (FR-031).
- **Given** the list of saved screens, **When** the user picks one, **Then** the criteria are restored and the screen is re-run against current data.
- **And** the user can delete or rename a saved screen.

### Story 4.3: Stock Comparison Table

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-4.3.md`**. Backend (`app/comparison.py` + `GET /compare`: parallel fundamentals + technicals + score merge for 2–4 symbols, a placeholder for BIST), web (the `/compare` page, search + add/remove, relative best/worst coloring) and mobile (`CompareScreen`) were implemented and verified. Verified end-to-end with real Finnhub/Twelve Data data.

As a **user**,
I want to compare at least 4 stocks side by side on fundamental and technical metrics,
So that I can decide which is the better choice.

**Acceptance Criteria:**

- **Given** the comparison screen, **When** the user adds 2–4 stocks, **Then** the selected stocks' fundamental and technical metrics are shown side by side in a table (FR-032).
- **Given** the comparison table, **When** one stock is clearly better/worse than the others on a metric, **Then** this is highlighted visually (e.g. color coding).
- **And** the user can remove a stock from the comparison.

---

## 9. Epic 5: Watchlist, Alerts, and Notifications

### Story 5.1: Creating and Managing Watchlists

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-5.1.md`**. DB (the `watchlists`/`watchlist_items` migration applied to live Supabase), backend (`app/watchlists.py` + `/watchlists` endpoints — the project's first authenticated write operations), web (the `/watchlist` page + an add/remove popover on the stock detail page) and mobile (`WatchlistScreen`, `AddToWatchlistButton`) were implemented and verified. Real browser/device visual verification was to be done on the user's side (no browser/simulator automation tool in this environment at the time).

As a **user**,
I want to add stocks I want to follow to one or more watchlists,
So that I can track the stocks I'm interested in from one place.

**Acceptance Criteria:**

- **Given** a stock detail page, **When** the user presses the "add to watchlist" button, **Then** the stock is added to the selected (or default) watchlist (FR-040).
- **Given** multiple watchlists, **When** the user creates a new list, **Then** they can name it as they like and distribute stocks across lists.
- **And** the user can remove a stock from a watchlist.

### Story 5.2: Setting a Price Alert

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-5.2.md`**. Backend (`app/alerts.py` + a `price_alerts` table + `/alerts` endpoints — US alerts are evaluated live against Finnhub on each `GET /alerts` call), web (the `/alerts` page + a "Set Price Alert" button on the stock detail page) and mobile (`AlertsScreen`, `CreatePriceAlertButton`) were implemented. **Verified live end-to-end against real Supabase + Finnhub** (see the story file — unlike earlier stories, real credentials were available this time). BIST alerts can be created, but since there is no live BIST price data their trigger state is explicitly marked "can't be evaluated" (no silently wrong state).

As a **user**,
I want to set a price-threshold alert for a stock,
So that I'm notified when the price reaches the level I set.

**Acceptance Criteria:**

- **Given** a stock detail page, **When** the user sets a "notify me if the price rises above / falls below" alert, **Then** the alert is saved in the backend `alerts` module (FR-041).
- **Given** an active price alert, **When** the market price crosses the threshold, **Then** the alert triggers once and its status is updated to "triggered."
- **And** the user can list and delete their active alerts.

### Story 5.3: Setting an Indicator/Signal Alert

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-5.3.md`**. Backend (a catalog of the 12 rules in `app/technical.py` + `app/signal_alerts.py` + a `signal_alerts` table + `/signal-alerts` and `GET /technical/rules` endpoints — Story 3.5's signal engine was reused unchanged), web ("Set Signal Alert" on the stock detail page + a `/signal-alerts` page) and mobile (`SignalAlertsScreen`, `CreateSignalAlertButton`) were implemented. **Verified live end-to-end against real Supabase + Finnhub** (RSI computed on real AAPL daily candles and the rule actually triggered). BIST is marked "can't be evaluated" for the same reason as Story 5.2.

As an **active trader**,
I want to set an alert on an indicator condition such as RSI/MACD,
So that I don't miss technical signals without tracking them manually.

**Acceptance Criteria:**

- **Given** a stock detail page, **When** the user picks a rule such as "notify me if RSI rises above 70," **Then** the alert is saved (FR-042).
- **Given** an active indicator alert, **When** Story 3.5's signal engine triggers the relevant condition, **Then** the alert fires.

### Story 5.4: Alert Notifications — Push and Email

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-5.4.md`**. Backend (`app/notifications.py` + a `user_notification_settings` table + `/notification-settings` endpoints; an Expo push/Resend email send is attempted from inside `evaluate_and_persist` the moment an alert triggers), web (an email notification card in `/settings`) and mobile (a push + email card in `SettingsScreen`, the permission/token flow via `expo-notifications`) were implemented. **Push was verified live at the send-request level**; on-device delivery couldn't be tested in this environment because Expo Go dropped remote push support in SDK 53+ (it needs an EAS dev-client — the same category as Story 1.2's native OAuth constraint; rationale in the story file). **Epic 5 was completed with this story.**

As a **user**,
I want to receive a push notification and/or email when an alert triggers,
So that I'm informed without keeping the app open.

**Acceptance Criteria:**

- **Given** a triggered alert, **When** the user has the mobile app installed, **Then** an instant notification is sent via Expo Push (FR-043, FR-070).
- **Given** the user has email notifications turned on, **When** an alert triggers, **Then** an email is sent via Resend.
- **And** the user can change their notification preferences (push/email/both) in settings.

---

## 10. Epic 6: Portfolio Tracking

### Story 6.1: Creating a Portfolio and Adding Positions

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-6.1.md`**. Backend (`app/portfolios.py` + `portfolios`/`positions` tables — weighted-average cost on buys, quantity reduction/insufficient-quantity check on sells), web (the `/portfolio` page, an inline transaction form) and mobile (`PortfolioScreen`) were implemented. Verified end-to-end against live Supabase + Finnhub (including the 100→150 average-cost calculation).

As a **user**,
I want to add the stocks I own to my portfolio with their quantity and cost price,
So that I can track my real investments through the app.

**Acceptance Criteria:**

- **Given** the portfolio screen, **When** the user enters a quantity and cost price for a stock, **Then** the position is added to their portfolio (FR-050).
- **Given** an existing position, **When** the user enters an additional buy/sell, **Then** the average cost is recalculated.
- **And** the user can delete a position.

### Story 6.2: Portfolio Value and Profit/Loss Calculation

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-6.2.md`**. `value_portfolios()`: per-symbol cached live prices (Finnhub), market value/unrealized profit-loss; positions whose price can't be fetched (BIST or an API error) are excluded from the total rather than counted as zero. Implemented and verified live.

As a **user**,
I want to see my portfolio's live total value and my per-position profit/loss,
So that I can track my investment performance.

**Acceptance Criteria:**

- **Given** the portfolio screen, **When** current prices change, **Then** the total portfolio value and each position's profit/loss (TRY/USD and %) update (FR-051).
- **Given** a position's current price can't be fetched, **When** the calculation runs, **Then** that position is marked "data can't be updated" and the total isn't shown incorrectly.

### Story 6.3: Multiple Portfolio Support

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-6.3.md`**. The schema was designed in Story 6.1 to support multiple portfolios from the start (consistent with the watchlist's "plural from the start" decision); web/mobile show all of a user's portfolios as a list of cards. **Epic 6 (Portfolio Tracking) was completed with this story.**

As a **user**,
I want to create multiple portfolios (e.g. "US stocks," "BIST long-term"),
So that I can track my different investment strategies separately.

**Acceptance Criteria:**

- **Given** the portfolio management screen, **When** the user creates a new portfolio, **Then** a separate portfolio is opened under the name they choose (FR-052).
- **Given** multiple portfolios, **When** the user switches between them, **Then** each portfolio's own positions and total are shown separately.

---

## 11. Epic 7: Personalization

### Story 7.1: Interest Profile and Highlights

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-7.1.md`**. No new table — `interest_sectors` is stored in Supabase `user_metadata` following the same pattern as Story 1.3's language preference (it reaches the backend as a JWT claim). Backend (`app/highlights.py` + `GET /highlights` — "top movers" using the screener's two-stage pattern), web (a sector picker in `/settings` + "Highlights" on `/dashboard`) and mobile were implemented the same way. Verified live with real Finnhub data.

As a **user**,
I want to mark the sectors/stocks I'm interested in,
So that I can see highlighted stocks that suit me on the home screen.

**Acceptance Criteria:**

- **Given** profile settings, **When** the user selects their sectors of interest, **Then** the preference is saved (FR-061).
- **Given** a saved interest profile, **When** the user opens the home screen, **Then** stocks highlighted by rule from the selected sectors (e.g. the day's top movers) are shown.

### Story 7.2: Adding a Personal Note to a Stock

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-7.2.md`**. Backend (`app/notes.py` + a `stock_notes` table, a single-row `ON CONFLICT DO UPDATE` upsert pattern), web and mobile (`StockNoteCard` on the stock detail page) were implemented. Verified end-to-end against live Supabase. **Epic 7 (Personalization) was completed with this story.**

As a **user**,
I want to add my own note to a stock I follow,
So that I can remember my thoughts/decisions about that stock.

**Acceptance Criteria:**

- **Given** a stock detail page, **When** the user types into the note field and saves, **Then** the note is stored privately for that user (FR-062).
- **Given** a previously added note, **When** the user reopens the page, **Then** they see the note and can edit/delete it.

---

## 12. Epic 8: Subscription and Monetization (Freemium)

### Story 8.1: Enforcing the Free/Premium Tier Split

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-8.1.md`**. A new `entitlements` table (defaults to `free` when there's no row); backend (`app/entitlements.py` + four `enforce_*_limit` functions, `GET /entitlements`, 403 enforcement on four create endpoints), web/mobile (a "My Plan" card in `/settings`, a data-delay notice on the stock detail page, a lock message in the advanced indicator section, 403 messages shown in the UI) were implemented and verified. **Story 8.2 (real purchase/RevenueCat) is waiting on the user setting up their own payment-provider accounts and was deliberately left out of scope.**
- **Update (2026-09-21):** The user chose to grow the user base until payment infrastructure is set up — via the `app/entitlements.py::ALL_FEATURES_FREE` flag, the entire freemium mechanism this story built (limits, `enforce_*`, DB schema, UI locks) was bypassed while kept intact; everything was unlocked for everyone under a "Free Access Period" badge, with no misleading "Premium" label. It can be reverted with a one-line flag. See `docs/stories/story-8.1.md` Technical Notes for details.

As a **free user**,
I want to see clearly which features are free and which are premium,
So that I know what I'd gain before upgrading.

**Acceptance Criteria:**

- **Given** a user on the free tier, **When** they try to access a premium feature (e.g. real-time data, the broad indicator library, unlimited screens/alerts), **Then** the feature is shown as locked and they're presented with an upgrade offer (FR-080, FR-081, FR-082).
- **Given** the free tier, **When** the user looks at price data, **Then** it is clearly stated that the data is delayed/daily.
- **And** access control is always resolved from the entitlement state cached by the backend; the client can never declare itself "premium" (AD-7).

### Story 8.2: Premium Subscription Purchase and Management

> **Deferred (2026-09-21):** The user chose to unlock all features for free and grow the user base before setting up payment infrastructure (see Story 8.1's update). This story will be picked up once payment-provider accounts (RevenueCat + Apple Developer Program + Google Play Console) are set up and real monetization is wanted; there is no active plan right now.

As a **user**,
I want to subscribe to premium and manage my subscription from within the app,
So that I can access real-time data and advanced features.

**Acceptance Criteria:**

- **Given** the upgrade screen, **When** the user picks a plan and completes the purchase (App Store/Play Store IAP, or Stripe on web), **Then** the entitlement is updated via RevenueCat and the user gets immediate access to premium features (FR-083).
- **Given** an active subscription, **When** the user cancels, **Then** premium access continues until the end of the current period, then reverts to the free tier.
- **And** subscription status (plan, renewal date) is shown on the settings screen.

---

## 13. Epic 9: AI-Assisted Commentary and Pattern Detection

> **Prerequisite:** Epic 1–8 (Phase 1 MVP) must be complete. For the decision rationale, the alternatives evaluated and rejected, and the open risk, see `docs/product-brief-epic9-ai.md`.

> **2026-09-18 update:** The user made Epic 9's scope concrete — three separate, clearly labeled views on the stock detail page: (a) Story 9.2's technical/chart reading by a CV model, (b) Story 9.1's LLM-generated fundamental-analysis report, (c) the Buy/Neutral/Sell output of the existing rule-based score (Story 3.6/3.7, already in production). For the rationale and the model/provider choice see `docs/product-brief-epic9-ai.md` §"2026-09-18 Update".

### Story 9.1: Fundamental Analysis AI Report

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-9.1.md`**. Backend (`app/ai_fundamental.py` + `GET /symbols/ai-report/fundamental` — calls to the Google Gemini API via `httpx` (switched from Anthropic Claude on 2026-09-19), RAG on Epic 2's fundamental data, a global per-symbol cache), web/mobile (a "Generate Report" panel + premium lock in the AI Analysis tab) were implemented; tests (mocked) are green. The free-tier 403 was verified live. **Verified live end-to-end with a real Gemini API key** (2026-09-20 — report generation for AAPL + served from cache on the second request).

As a **user (premium)**,
I want to read, on the stock detail page, an AI fundamental-analysis report grounded in the app's own fundamental data,
So that I can quickly understand the stock's fundamental picture without interpreting the numbers one by one.

**Acceptance Criteria:**

- **Given** a premium user opens a stock detail page, **When** they request the "Fundamental Analysis AI Report," **Then** a report generated by the Google Gemini API, grounded (RAG) in the fundamental data the app computes itself (P/E, ROE, debt-to-equity, sector comparison, historical financial performance), is shown (FR-100).
- **Given** a user on the free tier, **When** they reach the same section, **Then** the feature is shown as locked with a premium upgrade offer (FR-080); the backend also rejects the same request with 403.
- **Given** the stock's fundamental data is insufficient (e.g. BIST — no live fundamental data source), **When** a report is requested, **Then** a "not enough data" state is shown; no generic, hallucination-prone report is generated without data.
- **And** a permanent "not investment advice" notice sits under the report; the report is cached per symbol+exchange (not per user) to control LLM API cost.

### Story 9.2: Technical Analysis AI Report — CV Model

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-9.2.md`**. Of the 4 candidates in the PDF comparison report, ChartScanAI's YOLOv8 model was chosen (MIT license + a match with its mplfinance training data, verified live via the GitHub API/LICENSE); backend (`app/ai_technical.py` — chart image rendering with mplfinance, a lazy-loaded model, `GET /symbols/ai-report/technical`), web/mobile (the AI Analysis tab, three panels together with the existing deterministic score) were implemented and verified. **Verified live end-to-end with real AAPL/MSFT data** (real model weights, real candle data, including the cache and the free-tier 403).

As an **active trader**,
I want to see a technical AI report in which my price chart is read by an image-recognition model,
So that I can compare the model's "reading" with the other views (fundamental AI, deterministic score) without interpreting the chart manually.

**Acceptance Criteria:**

- **Given** a stock's candle data, **When** the user requests the "Technical Analysis AI Report," **Then** a chart image rendered from the candle data is read by a pretrained CV model (ChartScanAI/YOLOv8, MIT-licensed) and the result is presented as a "model's reading," **separate from and clearly labeled apart from** the deterministic score (FR-101).
- **Given** a finding is shown, **When** the user looks at it, **Then** it is framed as "the chart model's reading/finding"; the phrases "AI trading strategy" or "recommendation" are not used, and the model is stated to be experimental/indicative.
- **Given** a user on the free tier, **When** they request the report, **Then** the feature is shown as locked; the backend rejects the request with 403 (because of the CPU cost, client-side hiding alone isn't enough).
- **And** the report is cached per symbol+exchange; a real training/ML pipeline (FR-102/FR-025 — a model trained on our own data) is not in this story's scope and will be handled in a separate future phase.

### Story 9.3: Daily Sector Bulletin

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-9.3.md`**. User request (2026-09-19): an AI sector bulletin on the home screen, with a new one added on top every day and none ever deleted. Scheduling decision: instead of a cron/Celery infrastructure never set up in this project, generate-on-request + an append-only archive (`sector_bulletins` table, `bulletin_date unique`) — the user knowingly approved this choice. The sector is picked by a deterministic `day_of_year % 11` rotation, the stocks by the existing scoring engine (Story 3.6/3.7), and the narrative by Story 9.1's Gemini integration, now shared (`app/ai_reports.py::call_gemini()`). Backend (`app/bulletins.py` + `GET /bulletins`) and web/mobile (a "Bulletin" section on the dashboard) were implemented, tests (290/290) are green, and the free-tier 403 and the sector-selection/scoring pipeline were verified live. **Fully verified end-to-end with a real Gemini API key** (2026-09-20 — the day's bulletin was generated and the same `bulletin_date` was not regenerated on the second request).

As a **user (premium)**,
I want to see on the home screen an AI sector bulletin that gets a new entry every day and never loses its history,
So that I can follow which sectors/stocks stand out over time.

**Acceptance Criteria:**

- **Given** there is no bulletin row for today, **When** a premium user opens the dashboard, **Then** a new bulletin is generated for a sector chosen by deterministic rotation, with an analysis of the 5 highest-scoring stocks in that sector, and appended permanently; the next day the previous bulletin is not deleted or overwritten.
- **Given** a user on the free tier, **When** they open the dashboard, **Then** the bulletin section is shown as locked; the backend rejects the request with 403.
- **And** every bulletin ends with a "not investment advice" notice; if the chosen sector has no scorable stocks, no faulty row is saved for that day.

### Story 9.4: Combined Assessment AI Report

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-9.4.md`**. The code was written on 2026-09-19 (`8244f9d`, `352bea3`); this story file was opened retroactively on 2026-09-20. A third AI report that reads Story 9.1/9.2's fundamental and technical reports and summarizes whether they agree or conflict (`app/ai_combined.py` + `GET /symbols/ai-report/combined`, added to the existing `ai_reports` table as a third `report_type`); on web, the AI Analysis tab order became combined → technical → fundamental → deterministic score. The same day, raw network error messages in the AI Analysis cards were also fixed. Tests (316/316) green, ruff clean; the migration being applied to live Supabase and the free-tier 403 were verified on 2026-09-20. **Verified live end-to-end with a real Gemini API key.** The mobile panel (`AIAnalysisPanel.tsx`) was also added on 2026-09-20 — same ordering, same network-error fix (an equivalent empty-message bug in mobile's own `ReportCard` error handling was fixed along the way).

As a **user (premium)**,
I want to see, in the AI Analysis tab of the stock detail page, a single view summarizing whether the fundamental and technical reports agree or conflict,
So that I can quickly grasp the overall picture without comparing two separate reports myself.

**Acceptance Criteria:**

- **Given** a premium user, **When** they request the "Combined Assessment," **Then** the fundamental and technical reports are read (generated first if not ready) and a Gemini synthesis is shown.
- **Given** a user on the free tier, **When** they make the same request, **Then** the backend returns 403.
- **And** a "not investment advice" notice sits under the report; the synthesis is cached with a 5-hour TTL.
- **And** if a network-level error occurs, the user sees the app's own "data can't be provided right now" message, not the browser's raw error text.

---

## 14. Epic 10: Trading Simulation (Paper Trading)

> User request (2026-09-19) — new scope never planned anywhere before, developed in parallel with Epic 9. There is no real money/brokerage connection (see PRD §10); it is a sandbox run on an entirely virtual budget at real market prices. Deliberately separate from the existing Portfolio (Epic 6): Portfolio records real holdings at manually entered prices, while this feature is budget-constrained and orders execute automatically at the real live price.

### Story 10.1: Creating a Budgeted Simulation and Executing Orders

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-10.1.md`**. Backend (`app/simulations.py` — Portfolio's weighted-average/CRUD pattern + budget/cash mechanics + Story 9.3's append-but-upsertable daily snapshot pattern; `GET/POST /simulations`, `DELETE /simulations/{id}`, `POST /simulations/{id}/orders`, `GET /simulations/{id}/history`), web (the `/simulation` page, a dashboard nav entry) and mobile (`SimulationScreen`) were implemented; the free tier is limited to 1 simulation (Story 8.1's entitlement infrastructure was extended: `FREE_SIMULATION_LIMIT`). Tests (311/311) green, ruff clean, migration applied to live Supabase. **Verified live end-to-end with the real AAPL price** (including the order executing at exactly the real price, rejection when exceeding budget/quantity, BIST rejection, the daily snapshot upsert, and the free-tier 403).

As a **user**,
I want to trade virtually with real market data and a budget I set myself,
So that I can test my strategy without risking real money and see my performance over time.

**Acceptance Criteria:**

- **Given** a user creates a simulation with a starting budget, **When** they place a buy/sell order for a symbol, **Then** the order executes **at the current real market price**, not a price the user enters; the cash balance is updated accordingly.
- **Given** a buy order's cost exceeds the available cash balance, **When** the order is placed, **Then** it is rejected and cash/positions don't change. Likewise, a sell order exceeding the quantity held is rejected.
- **Given** a simulation, **When** the user looks at their performance over time, **Then** the daily total value (cash + position value) and profit/loss history are shown; records for past days never change again, only today's record is updated.
- **And** only US stocks are supported (there is no live price source for BIST); the free tier is limited to 1 simulation, premium is unlimited.

### Story 10.2: Symbol Autocomplete in the Simulation Order Form

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-10.2.md`**. The code was written on 2026-09-19 (`cd19c44`); this story file was opened retroactively on 2026-09-20. The order form's bare symbol text input gained the debounced `/symbols/search` suggestion list that already existed on the dashboard/comparison screens (web + mobile); clicking a suggestion fills in the symbol and exchange together. No backend change — the existing search endpoint was consumed from a new surface.

As a **user**,
I want to see a suggestion list while typing in the symbol field of the simulation order form,
So that I can pick the right symbol and exchange without knowing the exact ticker by heart.

**Acceptance Criteria:**

- **Given** the symbol field in the order form, **When** the user starts typing, **Then** a suggestion list appears after 300 ms.
- **Given** the suggestion list is open, **When** the user clicks a result, **Then** the symbol and exchange fields are filled in together.
- **And** racing searches are cancelled (`AbortController`); a stale result never overwrites the current input.

### Story 10.3: Buying in a Simulation from the Stock Page

- [x] **Done** — For detailed acceptance criteria and the task breakdown see **`docs/stories/story-10.3.md`**. User request (2026-09-26). A "Buy in simulation" button was added to the stock detail page header (web); it shows the simulation picker, the available cash, the quantity, and an estimated amount from the live price. A user with no simulation can create one with a single click without leaving the page. No backend change — Story 10.1's `GET /simulations` and `POST /simulations/{id}/orders` endpoints were used.

As a **user**,
I want to buy a stock I'm looking at into my simulation without leaving the page,
So that I don't have to go to the simulation screen and search for the symbol again to test an idea.

**Acceptance Criteria:**

- **Given** the detail page of a US stock, **When** the user clicks "Buy in simulation," **Then** they can pick one of their simulations, enter a quantity and place a buy order; the order executes at the current real price, as in Story 10.1.
- **Given** the user has no simulation, **When** they open the panel, **Then** they can create a simulation with one click and continue buying in the same panel.
- **Given** the order is rejected (insufficient balance, price unavailable, etc.), **When** the result returns, **Then** the API's descriptive message is shown in the panel; after a successful buy the cash balance is updated and a link to the simulation is offered.
- **And** the button appears only on US stocks (the simulator works only with live US prices).

---

## 15. Epic 11: Cryptocurrency Market

> User request (2026-09-26). The first step into the crypto asset class, which PRD §3 set aside as "Phase 2+ — the architecture must not be closed to it." Scope is **data, analysis and virtual trading only**: there is **no** real crypto trading, wallet or exchange-account connection (PRD §10 — brokerage/exchange integration is out of scope). Crypto is added to the existing stock features as a new exchange code (`CRYPTO`), so watchlists, alerts, portfolios and simulations extend without changing the existing `symbol + exchange` model.
>
> **Differences from stocks (to be considered in every story):** 24/7 trading (no sessions/close — a "daily" candle closes at the UTC day boundary); fractional quantities (0.0025 BTC); no fundamental-analysis concepts (P/E, ROE, balance sheet) — instead market cap, circulating supply, 24h volume; prices are usually quoted as a USD/USDT pair (`BTC/USD`).
>
> **Data source — tried live with the existing keys on 2026-09-26:**
>
> | Source | Live price | Candles (chart/indicators) | Market cap / supply | Note |
> |---|---|---|---|---|
> | Twelve Data (existing) | ✓ (`quote?symbol=ETH/USD`) | ✓ (`time_series?symbol=BTC/USD`) | ✗ | Shares the **same** 8-requests-per-minute quota with stocks — the biggest constraint |
> | Finnhub (existing) | ✓ (`quote?symbol=BINANCE:BTCUSDT`) | ✗ closed on the free plan | ✗ | Could be a fallback for live prices |
> | CoinGecko (keyless) | ✓ | ✓ (OHLC) | ✓ (ranking, supply, FDV) | Keyless access is low rate-limited; a free "demo" key is recommended |
>
> The final choice is made as the first task of Story 11.1; the default recommendation: Twelve Data for candles and live prices (the existing adapter pattern, same as `get_us_candles`), CoinGecko for market cap/supply/ranking — with aggressive caching.

### Story 11.1: Crypto Market Data Adapter

As a **developer**,
I want a backend adapter that serves search, live price and candle data for crypto assets the same way as the existing market data interface,
So that later stories can use crypto as a new exchange code without copying the stock flows.

**Acceptance Criteria:**

- **Given** the sources in the table, **When** the story starts, **Then** the data source is finalized as the first task and its rationale (quota, cost, license/ToS) is written into the story document (FR-120).
- **Given** a list of supported crypto assets (initially the top ~100 by market cap, a static JSON — the `bist_symbols.json` / `us_universe.json` pattern), **When** `GET /symbols/search` is called, **Then** results come back tagged `exchange: "CRYPTO"` (e.g. `BTC` — "Bitcoin").
- **Given** a crypto symbol, **When** `/symbols/overview` and `/symbols/candles` are called, **Then** price, 24-hour change and candles come back in the same shape as the existing stock responses; plus market cap and 24h volume.
- **And** crypto calls must not consume the stock calls' Twelve Data quota and slow down stock pages: cache durations and a request budget are defined, and exceeding the quota returns a descriptive warning (no silent failure — NFR-2).

### Story 11.2: Crypto Search and Detail Page

As a **user**,
I want to search for a cryptocurrency and see its price, chart and basic market information on a detail page,
So that I can follow my crypto assets in the same app where I follow stocks.

**Acceptance Criteria:**

- **Given** the search box, **When** the user types "BTC" or "Bitcoin," **Then** the asset appears in the results with a `CRYPTO` badge and clicking it opens the `/stock/CRYPTO/BTC` detail page (FR-121).
- **Given** a crypto detail page, **When** it opens, **Then** price, 24h change, market cap, circulating supply and 24h volume are shown; stock-specific sections that are meaningless for crypto (Fundamentals tab, sector, P/E score) are hidden or clearly marked "not applicable to crypto."
- **Given** the price chart, **When** the timeframe changes, **Then** a candlestick chart is drawn as for stocks; there are no session gaps because of 24/7 trading.
- **And** the page carries a note that crypto assets are highly volatile, plus the existing "not investment advice" notice; same behavior on web and mobile (NFR-6).

### Story 11.3: Crypto Technical Indicators and Signals

As an **active trader**,
I want to use the existing technical indicator and signal engine on crypto charts too,
So that I can see indicators like RSI and MACD and automatic signals for crypto without needing a separate tool.

**Acceptance Criteria:**

- **Given** a crypto candle series, **When** the technical tab opens, **Then** Epic 3's indicators and signal rules (`app/technical.py`) apply unchanged (FR-122).
- **Given** a signal alert for a crypto asset, **When** the condition occurs, **Then** it triggers as in Story 5.3; because the market is 24/7, it is evaluated on weekends too.
- **And** the stock-specific deterministic summary score (Story 3.6 — based on fundamental metrics such as P/E and ROE) is not applied to crypto; no score is shown for crypto, or it is redesigned in a separate story.

### Story 11.4: Crypto in Watchlists, Price Alerts, and Portfolios

As a **user**,
I want to add crypto assets to my watchlist and portfolio and set price alerts on them,
So that I can track my stock and crypto holdings from one place.

**Acceptance Criteria:**

- **Given** a crypto detail page, **When** the user adds it to a watchlist or sets a price alert, **Then** the Epic 5 flows work with `exchange: "CRYPTO"` (FR-123).
- **Given** a crypto position is being added to a portfolio, **When** a fractional quantity is entered (e.g. 0.0025), **Then** it is accepted and value/profit-loss calculations are correct with the fractional quantity.
- **And** currency and precision: crypto prices are shown in USD with enough decimals for low-priced assets (e.g. 0.000012 USD).

### Story 11.5: Crypto Trading in Simulations

As a **user**,
I want to buy and sell crypto assets in my simulations,
So that I can try crypto strategies without risking real money too.

**Acceptance Criteria:**

- **Given** a simulation, **When** a buy/sell order is placed for a crypto asset, **Then** the order executes at the current real crypto price; fractional quantities are supported (FR-124).
- **Given** a crypto detail page, **When** the user clicks "Buy in simulation," **Then** Story 10.3's panel works for crypto too.
- **And** the simulation's daily profit/loss history (FR-112) includes crypto positions; because the market is 24/7, the daily record is taken at the UTC day boundary.

### Story 11.6: Crypto Screening and Comparison

As a **user**,
I want to screen and compare crypto assets by market cap, volume and price change,
So that I can quickly see which assets stand out.

**Acceptance Criteria:**

- **Given** the screener screen, **When** "Crypto" is selected as the exchange, **Then** stock-specific criteria (P/E, ROE, debt-to-equity, sector) are hidden; market cap, 24h volume, 24h/7d change and RSI criteria are offered (FR-125).
- **Given** the comparison screen, **When** crypto assets are selected, **Then** they are shown side by side with crypto-appropriate metrics.
- **And** Story 4.1's two-stage design is kept: first a pre-filter over a free static universe, then live data only for the narrowed set — protecting the API quota.

### Story 11.7: AI Reports for Crypto (Scope Decision)

As a **product owner**,
I want to decide how Epic 9's AI reports will (or won't) be adapted to crypto,
So that we don't serve a misleading crypto report generated in the wrong context (under stock assumptions).

**Acceptance Criteria:**

- **Given** Story 9.1's fundamental-analysis report relies on stock fundamental data (RAG), **When** it is evaluated for crypto, **Then** either a new prompt is designed with crypto-specific inputs (market cap, supply, volume) or the report is clearly shown as "not supported" for crypto (FR-126).
- **Given** Story 9.2's CV model (ChartScanAI) was trained on stock charts, **When** it is used on a crypto chart, **Then** the result is shown only with an "experimental — the reading of a model trained on stock charts" label, or it is turned off for crypto.
- **And** the decision and its rationale are written into the story document; the existing "not investment advice" framing (PRD §9) is kept.

### Epic 11 — Open Questions

1. **Data source and cost:** Twelve Data's free quota of 8 requests per minute will be shared between stocks and crypto. As usage grows, moving to a paid plan or a separate source for crypto (CoinGecko) may be needed — settled in Story 11.1.
2. **Regulation:** Turkish regulations on crypto-asset service providers may not apply directly since this app offers only data/analysis and virtual trading; still, marketing and in-app copy must not give the impression of investment advice or a crypto trading service. Getting a legal opinion before release is recommended.
3. **Scope:** The starting universe (top ~100 assets? USD pairs only? stablecoins included?) and how crypto fits into the freemium limits (e.g. is the watchlist limit shared across stocks + crypto?) need to be clarified with the user.

---

## 16. Next Steps

*(Updated 2026-09-26 — the previous version described the project's starting state, "start with Story 1.1.")*

**Status:** Epics 1–7, 9 and 10 are complete; Story 8.1 is complete. Web and API have been live since 2026-09-21. Story 8.2 is deliberately deferred (`ALL_FEATURES_FREE`). The next development epic is Epic 11.

1. **Before starting Epic 11, the open questions in §15 must be settled with the user:** the data source (Twelve Data quota or CoinGecko), the starting universe (top ~100 assets, USD pairs, stablecoins), and whether freemium limits are shared between stocks and crypto.
2. **Suggested Epic 11 order:** Sprint 1 — 11.1 (data adapter) + 11.2 (search and detail); Sprint 2 — 11.3 (indicators/signals) + 11.4 (watchlist, alerts, portfolio; fractional quantities); Sprint 3 — 11.5 (simulation) + 11.6 (screening/comparison) + 11.7 (AI reports scope decision).
3. **Mobile parity (small, in parallel):** password reset and a verification screen on mobile (Story 1.7's open item), "Buy in simulation" on mobile (the mobile counterpart of Story 10.3).
4. **Unlocked together once a custom domain is bought:** Google OAuth (the consent screen rejects `vercel.app`), Apple Sign-In (also needs an Apple Developer Program membership), Supabase custom SMTP (Brevo), and `RESEND_API_KEY`/`NOTIFICATION_FROM_EMAIL` on Render for email alert notifications.
5. **Legal confirmation:** the regulatory risk in Story 9.1 (see `docs/product-brief-epic9-ai.md`) must be closed before any investor pitch; the same opinion should cover Epic 11's crypto copy (§15, open question 2).
6. **Mobile device verification:** the "mobile device/simulator verification" items left open in most stories' DoD can't be done in this development environment; the user needs to do one batch pass on a real device (or with an EAS development build). On-device push notifications (Story 5.4) also wait on `eas init` + a development build.
