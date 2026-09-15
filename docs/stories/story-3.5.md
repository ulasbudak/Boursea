---
title: "Story 3.5: Kural Bazlı Otomatik Sinyal Üretimi"
epic: "Epic 3 — Teknik Analiz ve Özet Değerlendirme Skoru"
story_id: "3.5"
status: done
created: 2026-09-15
updated: 2026-09-15
author: Bob (BMAD Scrum Master)
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md"]
depends_on: ["3.1"]
---

# Story 3.5: Kural Bazlı Otomatik Sinyal Üretimi

## Kullanıcı Hikayesi

As a **aktif trader**,
I want RSI/MACD/hareketli ortalama kesişimi gibi hazır kurallara göre otomatik üretilen sinyalleri görmek,
So that manuel taramaya gerek kalmadan potansiyel fırsatları fark edebileyim.

*(Kaynak: `docs/epics.md` §7, Epic 3 — Story 3.5; PRD FR-024.)*

## Bağlam — Bu Story'nin Kritik Mimari Kararı

Bu story, projede ilk kez **gerçek kalıcılık/zamanlama** gerektiren bir AC ile karşı karşıya: "son N sinyal, **tetiklenme tarihiyle birlikte** listelenir" — bu, zaman içinde biriken bir sinyal geçmişi ima ediyor, Story 3.2/3.3'ün oturum-bazlı indikatör seçimlerinden farklı. `architecture.md` AD-8, bu tür periyodik değerlendirmelerin Celery beat görevleri olmasını öngörüyor — ama bu proje boyunca (Story 1.4'ten beri) tutarlı bir şekilde tekrarlanan gerekçeyle (Postgres migration/Celery altyapısı hiç kurulmadı), bu story de o eşiği **geçmiyor**.

**Çözüm — istek-anında geriye dönük değerlendirme:** Story 3.1 sayesinde zaten bir sembolün geçmiş mum verisi (`/symbols/candles`, günlük zaman dilimi ~1 yıl) istemciye/backend'e çekilebiliyor. Bu story, kuralları **her istek geldiğinde, elimizdeki geçmiş veri penceresi üzerinden geriye dönük olarak** değerlendirir: "RSI hangi günlerde 30'un altına indi", "MACD sinyal çizgisini hangi günlerde yukarı/aşağı kesti", "SMA50 SMA200'ü hangi günlerde kesti" (Golden/Death Cross). Sonuç — hangi tarihlerde hangi kuralın tetiklendiği listesi — **tam olarak Celery ile günlük olarak üretilip DB'ye yazılmış olsaydı elde edilecek sonuçla aynıdır** (aynı deterministik kurallar, aynı geçmiş veri); tek fark üretim zamanlamasıdır (istek anında vs. arka planda zamanlanmış), bu da kullanıcı için gözlemlenebilir bir farka yol açmaz. Gerçek zamanlı/canlı tetikleme (örn. anlık bildirim) ihtiyacı netleşirse, o zaman Celery+DB altyapısının kurulması ayrı bir mimari karar/story olmalı — bu story o eşiği kasıtlı olarak geçmiyor.

**Backend `technical` modülü:** AC'ler ve `architecture.md`'nin FR haritası ("technical: İndikatör hesaplama, kural bazlı sinyal motoru | FR-021–FR-024") sinyal üretiminin **backend**'de olmasını açıkça istiyor. Story 3.2/3.3'te indikatör matematiği yalnızca `packages/shared` (TS) içinde vardı; bu story için RSI/EMA/SMA/MACD, zaten doğrulanmış TS formülleri temel alınarak **Python'a taşınır** (`app/technical.py`) — bu, mimarinin FR haritasına sadık kalır ve iki platformun (web/mobil) aynı backend sinyal listesini tüketmesini sağlar (Story 3.2/3.3'ün istemci-taraflı hesaplama modelinden bilinçli bir sapma, çünkü bu kez backend'in kendisi "kaynak" olmalı).

## Kapsam

- **Backend:** Yeni `app/technical.py` — Python'a taşınmış RSI/SMA/EMA/MACD; 6 kural (RSI aşırı satım/alım, MACD yukarı/aşağı kesişim, SMA50/SMA200 Golden/Death Cross); `GET /symbols/signals?symbol=&exchange=&timeframe=` (varsayılan `daily`).
- **Web/Mobil:** Teknik Analiz sekmesine "Sinyaller" bölümü — son 20 sinyal, kural adı + yön (yükseliş/düşüş) + tetiklenme tarihiyle.

**Kapsam dışı:**
- ML tabanlı sinyal/skorlama (PRD FR-025, Faz 2 — kapsam dışı olduğu PRD'de zaten belirtilmiş).
- Gerçek zamanlı/anlık tetikleme veya bildirim — Story 5.2/5.3 (Alarmlar) kapsamı, bu story yalnızca geriye dönük sinyal listesi üretir.
- Sinyallerin DB'de saklanması/zamanlanmış üretimi — yukarıda gerekçelendirildi.

## Görevler

1. **[Backend]** `app/technical.py`: `_sma`, `_ema`, `_rsi`, `_macd` (Python portu, `packages/shared`'daki TS formüllerinin birebir karşılığı).
2. **[Backend]** `SignalRule` tanımları (6 kural) ve `evaluate_signals(candles)`: her kural için geçiş noktalarını (önceki değer eşiğin dışında, şimdiki değer eşiğin içinde/kesişim yönü) tarar, `SignalRecord` listesi döner (en yeni önce, en fazla 20).
3. **[Backend]** `GET /symbols/signals` endpoint'i: mevcut `get_us_candles`/`get_bist_candles`'ı yeniden kullanır; BIST için boş + uyarı, ABD hata durumunda boş + uyarı (tutarlı desen).
4. **[Backend]** Birim testleri: Python port fonksiyonlarının doğruluğu (bilinen değerlerle), her kural için sentetik/kurgulanmış bir kesişim senaryosuyla doğru sinyalin doğru tarihte üretildiğinin doğrulanması, endpoint testleri.
5. **[Web]** `signal-list.tsx`: Teknik Analiz sekmesine, sinyalleri lazy-fetch eden yeni bir bölüm.
6. **[Mobil]** `SignalList.tsx`: aynı davranış.

## Kabul Kriterleri

**AC1 — Sinyal üretimi ve gösterimi**
- **Given** bir hissenin geçmiş teknik verisi, **When** tanımlı kurallardan biri (örn. "RSI 30 altına düştü") geçmişte herhangi bir tarihte sağlanmışsa, **Then** backend `technical` modülü bu tarih için bir sinyal kaydı üretir ve hisse detay sayfasının Teknik Analiz sekmesinde gösterilir (FR-024).

**AC2 — Sinyal geçmişi listesi**
- **Given** sinyal listesi, **When** kullanıcı bir hissenin sinyal geçmişine bakarsa, **Then** son 20 sinyal, kural adı ve tetiklenme tarihiyle birlikte (en yeni önce) listelenir.

**AC3 — Kural bazlı/deterministik**
- **And** sinyal üretimi tamamen kural bazlı/deterministiktir (aynı geçmiş veri her zaman aynı sinyalleri üretir); ML tabanlı skorlama bu story kapsamında değildir (PRD FR-025, Faz 2).

**AC4 — Veri yoksa çökme değil net durum**
- **Given** BIST sembolü veya Finnhub hatası, **When** sinyal listesi istenirse, **Then** boş liste + "veri şu an güncellenemiyor" tarzı bir uyarı döner, sayfa çökmez (NFR-2 ile tutarlı).

## Definition of Done

- [x] AC1–AC4 karşılanıyor ve doğrulandı (backend: pytest 77/77 yeşil + canlı `uvicorn` smoke test; web: typecheck/lint/build; mobil: typecheck/lint + Metro bundle (iOS)).
- [x] `FINNHUB_API_KEY` olmadan da uygulama çökmüyor.
- [x] Yeni ortam değişkeni gerekmedi.

## Teknik Notlar

- 6 kural: `rsi_oversold` (RSI önceki ≥30, şimdiki <30), `rsi_overbought` (önceki ≤70, şimdiki >70), `macd_bullish_cross` (MACD-Signal önceki ≤0, şimdiki >0), `macd_bearish_cross` (önceki ≥0, şimdiki <0), `golden_cross` (SMA50-SMA200 önceki ≤0, şimdiki >0), `death_cross` (önceki ≥0, şimdiki <0).
- Sinyal listesi `daily` zaman dilimindeki (~1 yıllık) mum verisi üzerinden hesaplanır; `intraday`/`weekly`/`monthly` için bu story kapsamında ayrı bir sinyal hesaplaması yapılmaz (varsayılan `daily`).
- Bu story'nin kabul ettiği performans maliyeti: her `/symbols/signals` isteği, sinyalleri baştan hesaplamak için tüm geçmiş pencereyi tarar (önbellek yok) — Story 2.1/2.2/2.3/3.1 ile tutarlı bir MVP basitliği tercihi.
