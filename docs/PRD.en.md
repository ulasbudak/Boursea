---
title: "Borocean (Stock Tracking App) - Product Requirements Document"
status: draft
created: 2026-09-15
updated: 2026-09-16
author: Mary (BMAD Business Analyst) — together with Serdar Ulaş Budak
language: en
translationOf: docs/PRD.md
---

# Borocean — PRD

*This is the English translation of [`docs/PRD.md`](PRD.md), which remains the source of truth. If the two ever disagree, the Turkish version wins until this file is re-synced.*

## 1. Summary and Vision

**Borocean** is an investment research app — for web and mobile — that evaluates stocks on the American (NYSE/NASDAQ) and Turkish (BIST) exchanges using the world's most widely used **fundamental analysis** parameters, plus a comprehensive **technical analysis** experience.

The product targets a layered experience that serves both the beginner individual investor (summary scores, plain-language metrics) and the active trader (a broad indicator library, screening/signal tools). The app is **not a brokerage** — it does not route buy/sell orders; it positions itself purely as a research and decision-support tool.

**Vision statement:** "The one app where a user can evaluate any stock on the US and Turkish exchanges against world-standard metrics within seconds, and fold it straight into their own watchlist/portfolio flow."

## 2. Target Audience

| Segment | Definition | Primary Need |
|---|---|---|
| **New / Amateur Investor** | New to fundamental-analysis concepts, wants to avoid complexity | A plain summary score, a fast answer to "is this stock cheap or expensive?" |
| **Active Trader / Technical Analyst** | Experienced at reading charts and using indicators | A broad indicator library, multiple timeframes, screening/signals |

The app serves both segments off the same underlying data, at different depths (a simple summary layer plus a detail layer you can drill into).

## 3. Markets and Assets Covered

- **Phase 1 (MVP):** Stocks only. US exchanges (NYSE, NASDAQ) and Turkey (BIST) — all traded stocks, plus major indices (S&P 500, Nasdaq 100, Dow Jones, BIST 100, BIST 30, etc.) and ETFs are supported as first-class assets.
- **Phase 2+ (out of scope, but the architecture must not be closed to it):** Cryptocurrency and foreign-exchange (forex) asset classes.

## 4. User Journeys

> Note: The journeys below are drafts; they will be finalized with user confirmation (see Open Questions).

**UJ-1 — Ayşe, a first-time individual investor:**
Ayşe searches the app for a US stock she heard about in the news. On the company card she first sees a **summary score/rating** and a plain-language comment like "this stock is cheap/expensive relative to its sector." She sees a handful of key metrics — P/E, dividend yield — compared against the sector average. She adds the stock to her watchlist and sets an alert to be notified if the price drops below a certain level.

**UJ-2 — Mehmet, an active trader:**
As part of his morning routine, Mehmet opens the **advanced screener** to find BIST stocks matching his criteria: he combines and saves criteria like market cap, RSI range, volume increase, and a multi-day breakout. He opens one of the results, adds MACD and Bollinger Bands to the chart, reviews several stocks side by side in a comparison table, and tracks the live profit/loss of the position he added to his portfolio.

## 5. Functional Requirements

Requirements are grouped by feature area and numbered globally. The **[MVP]** tag marks Phase 1 scope; **[F2]** marks items deferred to Phase 2 (see Section 8 — Phase Plan).

### 5.1 Stock Search and Discovery

- **FR-001** [MVP] Users must be able to search US and BIST stocks by symbol or company name; results must be listed with an exchange/market label (e.g. NASDAQ, BIST).
- **FR-002** [MVP] Each stock must have an "Overview" card: current price, daily change, market cap, and basic company information (sector, industry).
- **FR-003** [MVP] The system must produce a simple **summary score/rating** (derived from a combination of fundamental + technical signals, an indicator legible to an amateur user — e.g. a 1–100 score or a Buy/Neutral/Sell label).

### 5.2 Fundamental Analysis

- **FR-010** [MVP] The system must display the world's most commonly used fundamental analysis metrics: P/E, P/B, ROE, ROA, EPS and EPS growth rate, dividend yield, debt-to-equity ratio, gross/net profit margin, market cap, EBITDA margin, free cash flow.
- **FR-011** [MVP] Each metric must be shown compared against the stock's **sector/index average** (e.g. "Sector average P/E: 18.2, this stock: 14.5").
- **FR-012** [F2] Users must be able to build a **customized evaluation score** by weighting metrics according to their own priorities (a customizable scoring engine).
- **FR-013** [MVP] The company's historical financials (revenue, net income, EPS) must be presented as a chart for at least the last 5 years/20 quarters.

### 5.3 Technical Analysis

- **FR-020** [MVP] Interactive price chart: candlestick, line, and bar chart types; intraday, daily, weekly, and monthly timeframes must be supported.
- **FR-021** [MVP] A core indicator set must be addable to the chart: Simple/Exponential Moving Averages (SMA/EMA), RSI, MACD, Bollinger Bands, Volume, Stochastic Oscillator.
- **FR-022** [MVP] A broad indicator library (30+ indicators: ADX, Fibonacci Retracement, Ichimoku, ATR, OBV, Parabolic SAR, Williams %R, etc.) must be supported.
- **FR-023** [MVP] Users must be able to add manual drawing tools to the chart, such as trend lines and horizontal support/resistance lines.
- **FR-024** [MVP] **Rule-based automatic signal generation**: the system must be able to generate and list signals based on user-defined or built-in rule sets (e.g. "RSI dropped below 30," "MACD made a golden cross," "price crossed above the 50-day moving average"). *(Note: Phase 1 targets a rule-based/deterministic signal engine; ML-based predictive models are Phase 2 scope — see FR-025.)*
- **FR-025** [F2] Machine-learning-assisted pattern recognition / probabilistic signal scoring (advanced, to be evaluated after Phase 1).

### 5.4 Screener and Comparison

- **FR-030** [MVP] Users must be able to run a **multi-criteria screen** by combining fundamental AND technical criteria together (e.g. market-cap range, P/E range, RSI range, volume increase, sector, exchange).
- **FR-031** [MVP] Screening criteria must be savable, and saved screens must be re-runnable with one click.
- **FR-032** [MVP] Users must be able to compare multiple stocks (at least 4) side by side in a **comparison table** with fundamental and technical metrics.
- **FR-033** [F2] Automatic notifications for saved screens ("a new stock matching your criteria was found") must be supported.

### 5.5 Watchlist and Alerts

- **FR-040** [MVP] Users must be able to add an unlimited number of stocks to one or more watchlists.
- **FR-041** [MVP] Users must be able to set a price-threshold alert (rises above / falls below).
- **FR-042** [MVP] Users must be able to set an indicator/signal-based alert (e.g. "notify me if RSI rises above 70").
- **FR-043** [MVP] When an alert triggers, the user must be notified via push notification (mobile) and/or email.

### 5.6 Portfolio Tracking

- **FR-050** [MVP] Users must be able to manually add stocks they own to a portfolio (quantity + cost price).
- **FR-051** [MVP] The system must compute the portfolio's live total value and per-position profit/loss (in TRY and %).
- **FR-052** [MVP] Multiple portfolios must be supported (e.g. "US stocks," "BIST long-term").
- **FR-053** [F2] Portfolio risk/diversification analysis (sector distribution, over-concentration warning) must be provided.

### 5.7 User Account and Personalization

- **FR-060** [MVP] Users must be able to sign up and log in with email or a social account (Google/Apple).
- **FR-061** [MVP] Users must be able to build a personal interest profile by tagging sectors/stocks they care about; the home screen must surface stocks/news based on that profile (rule-based recommendation, Phase 1).
- **FR-062** [MVP] Users must be able to add personal notes to stocks they follow.
- **FR-063** [F2] An advanced, behavior-data-driven **personalized recommendation engine** (smarter than the Phase 1 rule-based recommendation, based on usage history).

### 5.8 Notifications

- **FR-070** [MVP] Push notifications (mobile) and email notifications must be supported.
- **FR-071** [F2] An SMS notification channel (optional, could be considered a premium feature).

### 5.9 Subscription / Monetization (Freemium)

- **FR-080** [MVP] The app must run on a **freemium** model: there must be a clear feature split between the free and premium tiers (see Section 7 — Open Questions; the exact line will be finalized).
- **FR-081** [MVP] The free tier must offer: delayed/daily price data, fundamental metrics, a limited number of watchlist items, and core indicators.
- **FR-082** [MVP] The premium tier must offer: real-time data, the broad indicator library, unlimited screening/alerts, and advanced comparison.
- **FR-083** [MVP] Users must be able to purchase and manage a subscription from within the app (upgrade/cancel); payment provider integration (in-app purchase via App Store/Play Store + card payment on web) must be supported.

### 5.10 Localization

- **FR-090** [MVP] The app UI must be offered in Turkish and English, and the user must be able to change their language preference.
- **FR-091** [MVP] Number/currency formats (thousands separator, decimal, TRY/USD display) must automatically adapt to the selected language and market.

### 5.11 AI-Assisted Commentary and Pattern Detection

> **Analyst note (2026-09-16):** This section covers an expansion the user marked as **first priority** after the MVP (Phase 1, Epic 1–8) is complete (see `docs/product-brief-epic9-ai.md` for the decision rationale and the alternatives evaluated and rejected). This section's scope overlaps FR-025; FR-102 is its concretized/expanded form.

- **FR-100** [F2 — first priority post-MVP] The system must generate a **free-form AI commentary** for the selected stock on the stock detail page. The commentary must be grounded (RAG) in Finnhub company news (`company-news`) and the app's own fundamental/technical data — it must not rely on raw LLM training data alone. This feature is gated behind the premium tier (see FR-080–083).
- **FR-101** [F2 — first priority post-MVP] The system must perform **deterministic (rule-based) chart pattern recognition** on the price chart: trend lines, support/resistance levels, and classic formations (triangle, head-and-shoulders, etc.) must be automatically detected and marked on the chart. The output must be framed under the same legal posture as the existing signal engine (FR-024) — as a **"pattern/signal finding,"** never in advice-like language such as "AI trading strategy" (see Section 9, the investment-advice boundary).
- **FR-102** [F2 — the expanded form of FR-025] Building on FR-101's rule-based foundation, pattern recognition/probabilistic signal scoring must be performed with an **ML model** trained on historical market data. This is a concrete implementation of the work already defined under FR-025; since it requires a separate data/ML pipeline (training, evaluation, retraining loop), it must be tackled in a later sub-phase of Phase 2, after FR-100/FR-101 have shipped.

## 6. Non-Functional Requirements (NFR)

| Category | Requirement |
|---|---|
| **Performance** | Real-time price data must reach the user with a reasonable delay from the market source (target: within a few seconds). Stock search results must return in under 1 second. |
| **Reliability** | The app must be available at a target uptime level during market hours (suggested: 99.5%+). On a data-provider outage, the user must see a "data delayed/unavailable" warning — no silent failures. |
| **Data Accuracy and Disclaimer** | Every screen must carry a "not investment advice" notice; data-provider license/delay terms must be disclosed transparently to the user. |
| **Security** | User account information and portfolio data (financial personal data) must be stored encrypted; authentication must use industry-standard methods (OAuth/JWT, etc.). |
| **Scalability** | The system must be designed to handle the data volume from two separate markets (US + BIST) and a growing user base, including compute-heavy operations like screening. |
| **Cross-Platform Consistency** | Feature parity and a consistent user experience must be targeted between web and mobile (iOS/Android); mobile-specific constraints (small screen) must be accounted for in chart/screener UIs. |
| **Legal/Compliance** | Since the app does not provide investment-advisory/brokerage services, the boundary that keeps it outside relevant financial-advisory regulation (US/Turkey) must be clarified; the data license/distribution permissions required for BIST data must be researched (see Open Questions). |

## 7. Success Metrics

| Metric | Target Direction | Counter-metric |
|---|---|---|
| Monthly Active Users (MAU) | Increase | Support/complaint rate per user must not increase |
| Free → Premium conversion rate | Increase | Premium cancellation rate within the first 30 days must stay low |
| Weekly watchlist/screening interactions per user | Increase | Data-accuracy complaint rate must not increase |
| 30-day user retention | Increase | — |

## 8. Phase Plan (MVP vs. Later)

**⚠️ Scope Risk (analyst note):** The user expressed a clear preference for the MVP scope to include "everything" (fundamental analysis + sector comparison + a broad technical indicator library + automatic signals + advanced multi-criteria screening + watchlist + portfolio + user account + personalization, bilingual, with freemium billing infrastructure). Taken together with a **solo developer + a few-month target**, this is high-risk. The phase split below proposes deferring the relatively lower-complexity items (ML-based personalization, customizable score weighting, portfolio risk analysis, automatic screen notifications, SMS) to Phase 2, while staying faithful to the user's stated priorities (sector comparison and advanced screening in particular). This proposal is open to user approval (see Section 9).

- **Phase 1 (MVP):** FR-001, 002, 003, 010, 011, 013, 020–024, 030–032, 040–043, 050–052, 060–062, 070, 080–083, 090–091.
- **Phase 2 (in priority order):**
  1. **FR-100, FR-101** (AI-assisted stock commentary + deterministic chart pattern recognition) — marked by the user as the **first priority** after MVP (see `docs/product-brief-epic9-ai.md`), added to the backlog as Epic 9.
  2. **FR-102** (ML-based pattern recognition — the expanded form of FR-025), FR-012 (customizable score weighting), FR-033 (screen notifications), FR-053 (portfolio risk analysis), FR-063 (advanced personalization), FR-071 (SMS) — no firm priority order has been set among these yet.
- **Out of scope (for now):** Crypto/forex asset classes, social/community features, actual order routing (brokerage integration).

## 9. Open Questions and Assumptions

- **[ASSUMPTION]** Exactly where the freemium line will be drawn (e.g. how many watchlist items / how many screens a free user gets) is not yet finalized — this must be settled before Phase 1 development begins.
- **[ASSUMPTION]** The real-time data provider (separately for US and BIST) has not yet been chosen; cost, license terms, and the latency SLA will affect the NFRs depending on this choice.
- **[OPEN QUESTION]** The official data license/distribution-permission requirements for BIST data must be researched (Borsa İstanbul's data-distribution policies).
- **[OPEN QUESTION]** The phase-split proposal in Section 8 must be approved by the user; if not approved, the timeline may need to extend or additional developer capacity may be needed.
- **[ASSUMPTION]** The user journeys (UJ-1, UJ-2) are written as drafts and have not been validated against a real user account.
- **[OPEN QUESTION]** The exact formula for the summary score/rating (FR-003) algorithm (which metrics combine at what weight) needs to be defined.
- **[OPEN QUESTION — must be settled before any investor pitch]** The boundary that keeps the app outside investment-advisory regulation in the US/Turkey has become more concrete alongside FR-100/FR-101/FR-102 (AI commentary + pattern recognition/strategy): whether "pattern/signal finding" language (as opposed to "advice") is a legally sufficient framing should be confirmed with legal counsel. See `docs/product-brief-epic9-ai.md`.

## 10. Explicit Out of Scope

- Actual order routing / brokerage integration.
- Non-equity asset classes such as crypto, forex, commodities (Phase 1).
- Social features between users (comments, sharing, following).
