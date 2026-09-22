---
title: "Epic 9 — AI-Assisted Commentary and Pattern Detection: Decision Note"
status: draft
created: 2026-09-16
updated: 2026-09-16
author: Mary (BMAD Business Analyst) — together with Serdar Ulaş Budak
relatedDocs: ["docs/PRD.en.md §5.11, §8, §9", "docs/epics.en.md §13 (Epic 9)"]
language: en
translationOf: docs/product-brief-epic9-ai.md
---

# Epic 9 — AI-Assisted Commentary and Pattern Detection: Decision Note

*This is the English translation of [`docs/product-brief-epic9-ai.md`](product-brief-epic9-ai.md), which remains the source of truth. If the two ever disagree, the Turkish version wins until this file is re-synced.*

## Context

This document records the rationale from a discovery discussion about an expansion to be added once the current Phase 1 MVP backlog (Epic 1–8) is complete. Since Boursea is a project that **will be pitched to investors**, the decisions recorded here — especially the regulatory risk — must be resolved before any investor presentation.

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

After Epic 1-8 (Phase 1 MVP, except Story 8.2 — still waiting on the user's own payment-provider setup), the user made Epic 9 concrete as three separate, clearly labeled "opinions" shown together on the stock detail page: (a) a pretrained computer-vision model's chart reading, (b) an LLM-generated fundamental-analysis report, (c) the existing rule-based score's (Story 3.6/3.7) Buy/Neutral/Sell output. See `docs/product-brief-epic9-ai.md` §"2026-09-18 Güncellemesi" (Turkish, canonical) for the full detail: model selection (ChartScanAI, MIT-licensed YOLOv8, chosen over three other open-source candidates after live license/technical verification), LLM provider (Anthropic Claude API, a custom "financial analyst" system prompt — no separate "Claude finance skill" product could be confirmed to exist), and architecture decisions (no Celery, global per-symbol cache, lazy-loaded CV dependency, backend-enforced entitlement gate). Detailed plans: `docs/stories/story-9.1.md` (now "Fundamental Analysis AI Report") and `docs/stories/story-9.2.md` (now "Technical Analysis AI Report — CV Model").
