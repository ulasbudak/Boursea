---
title: "Story 3.7: Gelişmiş Al/Sat Önerisi Motoru"
epic: "Epic 3 — Teknik Analiz ve Özet Değerlendirme Skoru"
story_id: "3.7"
status: done
created: 2026-09-15
updated: 2026-09-15
author: Bob (BMAD Scrum Master)
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md"]
depends_on: ["3.5", "3.6"]
---

# Story 3.7: Gelişmiş Al/Sat Önerisi Motoru

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want özet skorun yalnızca bir sayı değil, kaç göstergenin hangi yönde olduğunu ve bunun okunabilir bir gerekçesini de görmek,
So that "al/sat önerisi"ne ne kadar güvenebileceğimi ve neye dayandığını anlayabileyim.

*(Kaynak: kullanıcı isteği — "teknik analizi otomatize bir şekilde yapacak ve al sat önerilerinde bulunacak" — Story 3.5/3.6'nın güçlendirilmesi olarak kapsandı, yeni bir backend altyapısı kurmadan.)*

## Bağlam

Story 3.5 (`app/technical.py`) ve Story 3.6 (`app/scoring.py`) zaten kural bazlı bir sinyal motoru ve 1-100 özet skor + Al/Nötr/Sat etiketi üretiyor. Bu story onu üç yönde güçlendirir — **hepsi istek anında hesaplanmaya devam eder, yeni Celery/DB altyapısı kurulmaz** (bu projenin Story 1.4'ten beri sürdürdüğü tutarlı mimari karar):

1. **Daha fazla kural** — 6 kural, `packages/shared`'daki (Story 3.2) zaten doğrulanmış Bollinger Bantları ve Stokastik formüllerinin Python'a taşınmasıyla 12'ye çıkar.
2. **Güven skoru (konsensüs)** — 6 göstergenin *şu anki* (geçmiş tetiklenme değil, anlık durum) yönünü sayıp "4/6 gösterge yükseliş yönünde" gibi bir oran üretir; bu, skorun en büyük tekil faktörü olur.
3. **Gerekçe metni** — şablon tabanlı (LLM değil), deterministik bir özet cümle: skor+etiket, en güçlü faktör, konsensüs oranı, satır içi yatırım tavsiyesi değildir hatırlatması.

**Puan bütçesi neden değişiyor:** "Son 90 Günün Sinyal Eğilimi" faktörü (geçmiş sinyal olaylarını sayan) kavramsal olarak yeni konsensüs faktörüyle (anlık gösterge durumu) örtüşüyor. İkisini birden puanlamak yerine, daha zengin/granüler olan konsensüs (6 gösterge, önceki 15p yerine 25p) kullanılır; Trend ve RSI faktörleri hafifçe küçültülür (toplam yine 100p). Sinyal geçmişi (Story 3.5'in "Sinyaller" listesi) kendi başına, değişmeden gösterilmeye devam eder — bu yalnızca skorun hangi faktörleri kullandığıyla ilgili bir karar.

## Kapsam

- **Backend:** `app/technical.py`'ye 6 yeni kural (Bollinger kırılımı, Stokastik aşırı bölge kesişimi, SMA20/50 kısa kesişim); `app/scoring.py`'ye `TechnicalConsensus` modeli + `_compute_consensus()` + `_build_rationale()`; puan yeniden dengelemesi.
- **Web/Mobil:** Skor rozetine gerekçe metni + konsensüs satırı eklenir; mevcut faktör dökümü ve Sinyaller listesi değişmeden kalır.

**Kapsam dışı:**
- ML/istatistiksel model (PRD FR-025, Faz 2).
- Backtest edilmiş "kazanma oranı" iddiası.
- Yeni backend altyapısı (Celery/DB) — skor/sinyaller hâlâ istek anında hesaplanır.
- BIST davranışı değişmiyor (hâlâ `score: null` + uyarı).

## Görevler

1. **[Backend]** `_bollinger_bands()`, `_stochastic()` — TS portları (`bollinger-bands.ts`/`stochastic.ts`).
2. **[Backend]** `evaluate_signals()`'a 6 yeni kural: `bollinger_breakout_up/down`, `stochastic_bullish/bearish_cross`, `sma20_50_golden/death_cross`.
3. **[Backend]** `TechnicalConsensus` modeli, `_compute_consensus(candles)` (RSI/MACD/SMA50-200/SMA20-50/Bollinger/Stokastik'in anlık yönü).
4. **[Backend]** `_build_rationale(...)`; `StockScore`'a `consensus`+`rationale` eklenir; puan ağırlıkları yeniden dengelenir (Trend 20→15, RSI 15→10, Son 90 Gün→kaldırıldı, Konsensüs 25 yeni).
5. **[Backend]** `test_scoring.py`'deki eski ağırlık/faktör adına bağlı testler güncellenir; yeni testler (Bollinger/Stokastik portları, 6 yeni kural, konsensüs, rationale) eklenir.
6. **[Web]** `score-badge.tsx`: `rationale` + `consensus` gösterimi.
7. **[Mobil]** `ScoreBadge.tsx`: aynı.

## Kabul Kriterleri

**AC1 — Genişletilmiş kural seti**
- **Given** bir hissenin geçmiş teknik verisi, **When** Bollinger kırılımı, Stokastik aşırı bölge kesişimi veya SMA20/50 kesişimi geçmişte gerçekleşmişse, **Then** bu 6 yeni kural türü de sinyal listesinde (Story 3.5) görünür.

**AC2 — Güven/konsensüs skoru**
- **Given** özet skor hesaplanıyor, **When** skor yanıtı döner, **Then** 6 teknik göstergeden kaçının şu an yükseliş/düşüş/nötr yönde olduğunu gösteren bir konsensüs oranı (`consensus`) yer alır ve bu, skorun en büyük tekil faktörüdür (25/100).

**AC3 — Gerekçe metni**
- **And** skor yanıtı, skor+etiket, en güçlü katkı sağlayan faktör ve konsensüs oranını içeren, satır içi "yatırım tavsiyesi değildir" hatırlatmalı deterministik bir `rationale` cümlesi içerir.

**AC4 — Toplam puan tutarlılığı**
- **And** tüm faktörlerin toplamı her zaman skorun kendisine eşittir (100 puanlık bütçe korunur); mevcut testler bu yeniden dengeleme ile güncellenir, regresyon yaratmaz.

## Definition of Done

- [x] AC1–AC4 karşılanıyor ve doğrulandı (backend: pytest 103/103 yeşil + canlı `uvicorn` smoke test + örnek çıktı manuel incelendi; web: typecheck/lint/build; mobil: typecheck/lint + Metro bundle (iOS); shared: typecheck).
- [x] Mevcut 90 backend testi (Story 1.2-3.6) regresyon olmadan geçmeye devam ediyor; yalnızca `test_scoring.py`'deki ağırlık-bağımlı assertion'lar kasıtlı güncellendi (13 yeni test eklendi: `test_technical.py`'ye 8, `test_scoring.py`'ye 5).
- [x] Yeni backend endpoint'i veya bağımlılık eklenmedi.

## Teknik Notlar

- Konsensüs göstergeleri ve yönleri: RSI (<30 yükseliş/>70 düşüş), MACD histogram işareti, SMA50 vs SMA200, SMA20 vs SMA50, Bollinger konumu (üst bant üstü=yükseliş/alt bant altı=düşüş — kırılım/devam yorumu, aşırı alım/satım yorumu değil, RSI/Stokastik zaten o rolü üstleniyor), Stokastik %K (<20 yükseliş/>80 düşüş).
- **Uygulama sırasında netleştirilen bir ayrım:** RSI/Stokastik için sinyal listesi (Story 3.5) ile konsensüs (bu story) *kasıtlı olarak farklı* yön okumaları kullanır — sinyal listesi "RSI 30 altına düştü" olayını *az önceki fiyat momentumunu* tanımlayan bir etiketle (düşüş) gösterirken, konsensüs aynı anki RSI<30 durumunu *pozisyon önyargısı* olarak standart ortalamaya dönüş (mean-reversion) yorumuyla (yükseliş — olası tepki alımı) okur. MACD/SMA/Bollinger ise her iki bağlamda da trend-takip yorumuyla tutarlıdır. Bu, gerçek teknik analizde osilatörlerin (RSI/Stokastik) mean-reversion, trend göstergelerinin (MACD/SMA/Bollinger kırılımı) trend-takip mantığıyla okunmasının standart yoludur — kod içinde `_compute_consensus`'ta bir yorum satırıyla belgelenmiştir.
- `rationale` yalnızca Türkçe üretilir — mevcut backend uyarı mesajları (`"BIST hisseleri için..."` vb.) da yalnızca Türkçe, bu tutarlı bir mevcut sınırlamadır, bu story'de çözülmüyor.
