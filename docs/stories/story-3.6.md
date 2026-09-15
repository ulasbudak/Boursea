---
title: "Story 3.6: Özet Değerlendirme Skoru"
epic: "Epic 3 — Teknik Analiz ve Özet Değerlendirme Skoru"
story_id: "3.6"
status: done
created: 2026-09-15
updated: 2026-09-15
author: Bob (BMAD Scrum Master)
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md"]
depends_on: ["1.5", "2.1", "3.1", "3.5"]
---

# Story 3.6: Özet Değerlendirme Skoru

## Kullanıcı Hikayesi

As a **yeni/amatör yatırımcı**,
I want karmaşık metriklere girmeden hissenin genel durumunu özetleyen basit bir skor/etiket görmek,
So that hızlıca "bu hisseye bakmaya değer mi" sorusuna yanıt alabileyim.

*(Kaynak: `docs/epics.md` §7, Epic 3 — Story 3.6; PRD FR-003.)*

Bu, Epic 3'ün ve dolayısıyla PRD'nin Faz 1 (MVP) kapsamındaki tüm epiklerin son story'sidir — Epic 2 (Temel Analiz) ve Epic 3'ün (Teknik Analiz, Story 3.1-3.5) çıktısını tek bir özet gösterimde birleştirir.

## Bağlam

**Nerede gösterilir:** AC1 açıkça "hisse genel bakış kartı yüklenirse" diyor — bu, Story 1.5'te kurulan **"Genel Bakış" sekmesi**dir (Teknik Analiz veya Temel Analiz sekmesi değil). Skor, temel (fundamentals) ve teknik (candles/RSI/trend/sinyaller) verinin bir birleşimi olduğundan, Genel Bakış sekmesine gömülü, kendi bağımsız isteğini yapan (Story 2.1/2.2/2.3/3.5 ile aynı lazy-fetch deseni) küçük bir bileşen olarak eklenir.

**Skorlama yöntemi — kural bazlı, ML değil:** PRD FR-025 (ML tabanlı sinyal/skorlama) açıkça Faz 2'ye ertelenmiş; bu story yalnızca **şeffaf, deterministik, ağırlıklı bir puanlama** uygular — hiçbir istatistiksel model/eğitim yok. Puanlama iki eşit ağırlıklı yarıya (temel: 50 puan, teknik: 50 puan) bölünür, her biri birkaç faktörden oluşur; her faktörün kaç puan kazandırdığı kullanıcıya tam olarak gösterilir (AC3 — "bu skor neye dayanıyor" bilgi ipucu). Bu, "yatırım tavsiyesi değildir" ilkesiyle (NFR-3) tutarlı: skor, gerekçesi açık bir sezgisel özet olarak sunulur, kara kutu bir tahmin olarak değil.

**Yeni bir backend modülü:** `architecture.md`'nin FR haritasında FR-003 belirli bir modüle atanmamış (yalnızca Epic 3'e ait olduğu epics.md'de belirtilmiş) — bu, kavramsal olarak `fundamentals` VE `market_data`/`technical`'ı birleştiren ayrı bir bağlam olduğundan, yeni bir `app/scoring.py` modülü olarak eklenir (mevcut modüllerin sınırlarını bulandırmadan, AD-1 ile tutarlı).

**"Yeterli veri yok" eşiği (AC2):** Skor yalnızca hem temel hem teknik tarafta **kullanılabilir asgari veri** varsa hesaplanır: temel tarafta 5 puanlanan alandan en az biri doluysa, teknik tarafta en az 15 günlük mum verisi (RSI için asgari pencere) varsa. Biri bile tamamen eksikse (örn. BIST — temel veri sağlayıcısı henüz yok, Story 2.1/1.5/3.1 ile tutarlı), skor hesaplanmaz ve "yeterli veri yok" durumu gösterilir — asla hatalı/varsayılan bir skor üretilmez.

## Kapsam

- **Backend:** Yeni `app/scoring.py` — `compute_score(fundamentals, candles)`: 5 temel + 3 teknik faktör, her biri puan + gerekçe döner; `GET /symbols/score?symbol=&exchange=` (mevcut `get_us_fundamentals`/`get_bist_fundamentals` ve `get_us_candles`/`get_bist_candles`'ı yeniden kullanır).
- **Web/Mobil:** "Genel Bakış" sekmesine skor rozeti (1-100 + Al/Nötr/Sat etiketi) + açılır "bu skor neye dayanıyor" bilgi paneli (faktör dökümü); veri yetersizse "yeterli veri yok".

**Kapsam dışı:**
- ML/istatistiksel skorlama modeli (PRD FR-025, Faz 2).
- Kullanıcının faktör ağırlıklarını özelleştirmesi (PRD FR-012, Faz 2).

## Skorlama Modeli

**Temel faktörler (toplam 50 puan) — `fundamentals.py`'den:**
- F/K oranı: 0 < F/K < 15 → 10p; 15–25 → 6p; 25–40 → 2p; diğer/veri yok → 0p
- ROE: >%15 → 10p; %5–15 → 5p; diğer → 0p
- Borç/Özsermaye: <1 → 10p; 1–2 → 5p; diğer → 0p
- Net Kâr Marjı: >%15 → 10p; %5–15 → 5p; diğer → 0p
- EPS Büyüme Oranı: >0 → 10p; diğer → 0p

**Teknik faktörler (toplam 50 puan) — günlük mum verisinden (`technical.py` fonksiyonları yeniden kullanılır):**
- Trend (fiyat/SMA50/SMA200 sıralaması): güçlü yükseliş (fiyat>SMA50>SMA200) → 20p; fiyat>SMA50 → 12p; karışık → 6p; düşüş → 0p
- RSI (14): 40–60 (sağlıklı) → 15p; 30–40 veya 60–70 → 8p; <30 veya >70 (aşırı) → 0p
- Son 90 gündeki sinyal eğilimi (Story 3.5): net yükseliş → 15p; karışık → 7p; net düşüş → 0p

**Etiket:** skor ≥70 → "Al"; 40–69 → "Nötr"; <40 → "Sat".

## Görevler

1. **[Backend]** `app/scoring.py`: puanlama fonksiyonları, `ScoreFactor`/`StockScore` modelleri, `compute_score()`.
2. **[Backend]** `GET /symbols/score` endpoint'i: temel+teknik veriyi paralel çeker (`asyncio.gather`), her iki taraf da yeterli veri sağlarsa skor hesaplar, aksi halde `score: null` + uyarı.
3. **[Backend]** Birim testleri: her faktör için sınır değer testleri, eksik veri senaryosu (`score` `None`), tam veri senaryosunda toplam puanın/etiketin doğruluğu, endpoint testleri.
4. **[Web]** `score-badge.tsx`: skor + etiket + `<details>` tabanlı faktör dökümü; hisse detay sayfasının Genel Bakış içeriğine eklenir.
5. **[Mobil]** `ScoreBadge.tsx`: aynı davranış, native RN aç/kapa paneliyle.

## Kabul Kriterleri

**AC1 — Skor/etiket gösterimi**
- **Given** bir hissenin hem temel (Epic 2) hem teknik (Story 3.1-3.5) verisi mevcut, **When** hisse genel bakış kartı yüklenirse, **Then** 1-100 arası bir skor VE Al/Nötr/Sat etiketi gösterilir (FR-003).

**AC2 — Yetersiz veri durumu**
- **Given** temel veya teknik veri eksik (örn. BIST, veya Finnhub hatası), **When** skor hesaplanamazsa, **Then** "yeterli veri yok" durumu gösterilir; hatalı/rastgele bir skor asla gösterilmez.

**AC3 — Skor açıklaması**
- **And** skor açıklaması ("bu skor neye dayanıyor") kullanıcıya açılır bir bilgi paneliyle sunulur — her faktörün adı ve kazandırdığı puan listelenir.

## Definition of Done

- [x] AC1–AC3 karşılanıyor ve doğrulandı (backend: pytest 90/90 yeşil + canlı `uvicorn` smoke test; web: typecheck/lint/build; mobil: typecheck/lint + Metro bundle (iOS)).
- [x] `FINNHUB_API_KEY` olmadan da uygulama çökmüyor.
- [x] Yeni ortam değişkeni gerekmedi.
- [x] Epic 3 (ve PRD Faz 1/MVP'nin Epic 1-3 kapsamı) bu story ile tamamlandı.

## Teknik Notlar

- Skor hesaplaması istek-anındadır (önbellek yok) — Story 2.1-2.3/3.1/3.5 ile tutarlı MVP kararı; bir istek en fazla `/fundamentals`ın kendi iç maliyeti (temel + sektör kıyaslaması olmadan, yalnızca `get_us_fundamentals`) + `/symbols/candles`ın maliyeti kadar Finnhub çağrısı tetikler (sektör kıyaslaması burada hesaplanmaz, gereksiz).
- Puanlama ağırlıkları ve eşikleri kod içinde sabittir (`app/scoring.py`); kullanıcı özelleştirmesi PRD FR-012 (Faz 2) kapsamındadır.
