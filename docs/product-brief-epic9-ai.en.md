---
title: "Epic 9 — AI-Assisted Commentary and Pattern Detection: Decision Note"
status: draft
created: 2026-09-16
updated: 2026-09-26
author: Mary (BMAD Business Analyst) — together with Serdar Ulaş Budak
relatedDocs: ["docs/PRD.en.md §5.11, §8, §9", "docs/epics.en.md §13 (Epic 9)"]
language: en
translationOf: docs/product-brief-epic9-ai.md
---

# Epic 9 — AI-Assisted Commentary and Pattern Detection: Decision Note

*This is the English translation of [`docs/product-brief-epic9-ai.md`](product-brief-epic9-ai.md), which remains the source of truth. If the two ever disagree, the Turkish version wins until this file is re-synced.*

## Context

This document records the rationale from a discovery discussion about an expansion to be added once the current Phase 1 MVP backlog (Epic 1–8) is complete. Since Borocean is a project that **will be pitched to investors**, the decisions recorded here — especially the regulatory risk — must be resolved before any investor presentation.

## Priority Decision

The user chose to finish the existing roadmap (Epic 4–8, all Phase 1 MVP scope) **as-is and first**, adding the AI features **afterward**. The AI features are technically Phase 2 scope in the PRD, but the user moved them **ahead** of the rest of Phase 2 (FR-012, FR-033, FR-053, FR-063, FR-071) — so they were added to `docs/epics.md` as a separate epic (Epic 9), flagged as the first priority after MVP.

## Alternatives Considered and Decisions

### 1. Scope of the AI commentary

- **Options:** (a) a natural-language narration of the existing score/metrics — low risk, (b) free-form market/company commentary, (c) a chat interface, (d) staged (a→c).
- **Decision: (b) Free-form commentary.** The user wanted a richer commentary than the existing deterministic score/signal narration.
- **Analyst note:** Free-form commentary loses both currency and accuracy without a grounding data source (LLM training data alone), and weakens the "not investment advice" position. To reduce this risk, grounding was made mandatory (see below).

### 2. Grounding (data foundation)

- **Options:** (a) Finnhub `company-news` + the app's own data (RAG), (b) a separate news/sentiment API (Benzinga, Alpha Vantage), (c) no grounding (LLM knowledge alone).
- **Decision: (a).** It can be extended from the existing Finnhub subscription, requires no new third-party contract, and costs a moderate amount. (c) was not recommended for an investor pitch (hallucination risk) — recorded, not chosen.
- **Open item:** Confirm whether the `company-news` endpoint is included at Finnhub's current plan tier.

### 3. Placement and pricing

- **Decision:** Stock detail page only (screener, portfolio, home screen are out of scope — can be extended in a later story if desired). Gated behind the premium tier (the Epic 8 freemium gate) — to cover LLM cost and to give users a reason to upgrade.

### 4. Chart pattern recognition — technical approach

- **Options:** (a) deterministic rule-based detection (trend/support-resistance/classic formations), (b) a real ML model trained on historical data, (c) leave it undecided.
- **Decision: Staged — (a) first [Story 9.2], then (b) added to the plan [FR-102, the expanded form of FR-025].**
- **Analyst note (engineering-scale warning):** (b) is a separate product line requiring data collection/labeling, training, evaluation, and a retraining loop — under solo-developer + investor time pressure, this would compound the PRD's own "scope risk" note. (a) was chosen as the first phase because it shares the same philosophy as the existing rule-based signal engine (Story 3.5/3.7) and is fast and explainable. This is a concrete implementation of the FR-025 item already present in the PRD ("ML-based signal, Phase 2") — not new scope, just a clarified version of an existing open item.

### 5. "Trading strategy" framing (regulatory risk)

- **Options:** (a) present it as a "pattern/signal finding" (consistent with the product's existing language), (b) market it explicitly as an "AI trading strategy."
- **Decision: (a).** The PRD already carried an unresolved open question: *"the boundary that keeps the app outside relevant financial-advisory regulation (US/Turkey) needs to be clarified"* (PRD §9). An AI "producing a trading strategy" is an activity that approaches investment advisory in the eyes of Turkey's CMB (SPK) / the US SEC-FINRA, even without routing actual orders. (a) was preferred because it shares the same legal posture as the existing signal engine (FR-024).

## ⚠️ Risk to Close Before Any Investor Pitch

The existing open question in PRD §9 has become concrete and more urgent alongside this epic: **whether "pattern/signal finding" language is legally sufficient to stay outside the investment-advisory boundary must be confirmed with legal counsel.** This assumption underlies not just Epic 9 but also the existing signal engine (Story 3.5/3.7) and the summary score (Story 3.6) — investors will very likely ask about it.

## Next Steps

1. FR-100/101/102 and Story 9.1/9.2 in `docs/PRD.md` §5.11 and `docs/epics.md` §13 should be reviewed and approved by the user.
2. Legal opinion should be obtained on the regulatory risk above — before any investor presentation.
3. Finnhub `company-news` endpoint access and the LLM provider/cost choice should be finalized (an architecture decision, to be recorded in `docs/architecture.md`).
4. Epic 9 development does not start until Epic 1–8 (Phase 1 MVP) is complete.

## 2026-09-18 Update: Scope Made Concrete

After Epic 1–8 (Phase 1 MVP, except Story 8.2 — see the note below) was complete, the user made Epic 9's scope concrete as three separate, clearly labeled "views": (a) a technical/chart reading from an image-based (pretrained CV) model, (b) a fundamental-analysis commentary from an LLM API, (c) the Buy/Neutral/Sell output of the existing rule-based score (Story 3.6/3.7, already in production) — all three shown in the same panel, separate from each other and comparable. **Story 8.2 (the real premium purchase flow) is still waiting on the user setting up their own payment-provider account** — Epic 9 builds on Story 8.1 (the entitlement infrastructure) and does not depend on the purchase flow.

### (a) Technical Analysis AI — Model Selection

The user brought a comparison report named `hisse_ai_repo_karsilastirma_raporu.pdf` (4 candidates: huseinzol05/Stock-Prediction-Models, Omar-Karimov/ChartScanAI, foduucom/stockmarket-pattern-detection-yolov8, pecu/FinancialVision) and asked for the most usable one to be chosen and integrated. After live research (license + technical verification, via WebFetch):

| Candidate | License | Decision |
|---|---|---|
| huseinzol05/Stock-Prediction-Models | unclear, archived in July 2023 | Rejected — dependency incompatibilities, not "install and run" |
| foduucom/stockmarket-pattern-detection-yolov8 (Hugging Face) | **unspecified** ("contact the developers for licensing") | Rejected — embedding a model of unclear license in a commercial, investor-facing product is a legal risk; it is also trained on one specific screenshot region (683×768), mAP@0.5 = 0.614 (moderate accuracy) |
| **Omar-Karimov/ChartScanAI** | **MIT** | **Chosen** — free for commercial use, ready-made weights in the repo, training data is candlestick images **generated with mplfinance** (exactly the library we use to render images from our own OHLC data — low risk of distribution mismatch) |
| pecu/FinancialVision | research-oriented | Rejected — not a single integrable application |

**Known limitation:** ChartScanAI is backed by a relatively small community (157 stars) and no official accuracy metric has been published; its output is only a binary "Buy"/"Sell" classification (not named formations). The model will be positioned as "experimental/indicative" — subject to the existing "not investment advice" language policy, and shown as a second view that is separate from and clearly labeled apart from the deterministic score (Story 3.6/3.7) (whether the two views agree or disagree is shown transparently to the user).

### (b) Fundamental Analysis AI — Provider Selection

The user first mentioned an API called "Claude's finance skill"; no separately callable Anthropic product by that name could be confirmed. Instead, the **Anthropic Claude API** (console.anthropic.com, which requires a separate account and pay-as-you-go billing — a claude.ai Pro subscription does not include API access) will be used with a "financial analyst" system prompt we write ourselves; the RAG grounding will be the fundamental data the app computes itself (P/E, ROE, debt-to-equity, sector comparison, historical financial performance — the output of Epic 2).

> **2026-09-19 update:** The provider was switched to the **Google Gemini API** (commit `b868efb`, model `gemini-3.6-flash`) — the code now runs through `app/ai_reports.py::call_gemini()` with `GOOGLE_API_KEY`. The Anthropic rationale in this section is left as-is to document the decision date; for the current integration see `docs/stories/story-9.1.md` Context. The RAG grounding (Epic 2's fundamental data) and the cost-controlled caching pattern did not change.

### (c) Deterministic Analysis

No new development needed — `compute_score()` in `app/scoring.py` (Story 3.6/3.7) already produces a 0–100 score + a Buy/Neutral/Sell label + the "not investment advice" notice. It will be re-presented as the third panel next to (a) and (b).

### Architecture Decisions

- **No Celery/Redis** — although planned in the architecture (AD-8), no story has set it up so far; everything is computed at request time, and that consistency is kept.
- **Global cache** (`ai_reports` table, keyed by symbol + exchange + report type, with a TTL) — not per user, to control LLM/CV cost.
- **The heavy CV dependency (ultralytics/torch/mplfinance) is lazy-loaded** — only when the first request hits the technical AI endpoint, as a process-level singleton.
  - **2026-09-25 update (commit `d114072`):** Because Render's 512 MB memory limit was exceeded (ultralytics + torch pushed the process to ~800 MB), the model now runs on **ONNX Runtime**; torch and ultralytics were dropped from the dependencies. ultralytics' letterbox and class-aware NMS steps were reproduced exactly (detections verified identical on 8 charts). The ONNX file (>100 MB) is downloaded from the `chartscan-yolov8-onnx-v1` release asset and pinned by SHA-256. The lazy-loading, process-level singleton pattern is kept.
- **Entitlement extension**: `Entitlement.ai_reports: bool`, enforced on the backend (403) — unlike Story 8.1's advanced-indicator lock, client-side hiding alone is not enough here because there is a real money/CPU cost.

Detailed implementation plan: see Story 9.1 (`docs/stories/story-9.1.md`, now "Fundamental Analysis AI Report") and Story 9.2 (`docs/stories/story-9.2.md`, now "Technical Analysis AI Report — CV Model").

## 2026-09-19 Update: Story 9.3 — Daily Sector Bulletin

The user asked for an AI sector bulletin on the dashboard, with a new one added on top every day and none ever deleted (one sector + an analysis of the relatively strong stocks in that sector, premium-only). This is a fourth AI feature within Epic 9's scope.

**Scheduling decision:** The user was asked explicitly — no scheduled-job (Celery/cron) infrastructure has been set up anywhere in the project; everything is computed at request time. Instead of setting up a new cron/Railway job, the user approved a **generate-on-request + permanent archive** approach: the bulletin is generated on the day's first request and appended permanently; when a request comes in the next day, that day's bulletin is generated **in addition** and added on top of the older ones (never deleted or overwritten).

**Data pattern:** Since Story 9.1/9.2's `ai_reports` table was designed for a single-row-overwrite cache pattern, a separate `sector_bulletins` table was created for the bulletin (append-only, `bulletin_date unique`).

**Sector/stock selection:** The sector is chosen from `ALL_SECTORS` (11 sectors) by a deterministic `day_of_year % 11` rotation (zero extra API cost). The stocks in the sector are scored with the existing rule-based scoring engine (Story 3.6/3.7) and the top 5 are selected — no new selection algorithm was invented; the existing infrastructure was reused.

Detailed plan: `docs/stories/story-9.3.md`.
