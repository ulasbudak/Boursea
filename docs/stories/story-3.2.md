---
title: "Story 3.2: Çekirdek İndikatörler"
epic: "Epic 3 — Teknik Analiz ve Özet Değerlendirme Skoru"
story_id: "3.2"
status: done
created: 2026-09-15
updated: 2026-09-15
author: Bob (BMAD Scrum Master)
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md"]
depends_on: ["3.1"]
---

# Story 3.2: Çekirdek İndikatörler

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want grafiğe SMA/EMA, RSI, MACD, Bollinger Bantları, Hacim, Stokastik gibi çekirdek indikatörleri ekleyebilmek,
So that temel teknik analiz yapabileyim.

*(Kaynak: `docs/epics.md` §7, Epic 3 — Story 3.2; PRD FR-021.)*

## Bağlam

**Hesaplama nerede yapılır:** SMA/EMA/RSI/MACD/Bollinger/Stokastik tamamen matematiksel, saf fonksiyonlardır ve zaten Story 3.1 ile istemciye çekilmiş olan mum verisinden (OHLCV) hesaplanabilir — backend'e yeni bir endpoint eklemeye gerek yok. Hesaplama mantığı `packages/shared`'a konur (Story 1.3'te i18n için kurulan pakete ikinci gerçek modül) — web ve mobilin aynı formülü kullanması NFR-6 (Platformlar Arası Tutarlılık) gereğidir ve `market_data`'nın normalize veri sözleşmesi (AD-5) bozulmaz.

**Grafik entegrasyonu:** Story 3.1'de kurulan `lightweight-charts` v5, overlay (fiyat panelinin üzerine, örn. SMA/EMA/Bollinger) ve ayrı panel (`chart.addSeries(..., paneIndex)`, örn. RSI/MACD/Stokastik/Hacim) desteğiyle gelir — paketin kendi `dist/typings.d.ts`'inden `addPane`/`removePane`/`panes()` API'si doğrulandı. Bir indikatör kaldırıldığında yalnızca o indikatöre ait pane/seri kaldırılır (`chart.removeSeries()`/`chart.removePane()`), diğerleri etkilenmez.

**Kapsam sınırı:** Story 3.2 yalnızca 7 "çekirdek" indikatörü kapsar (FR-021). Geniş kütüphane (30+ indikatör, parametre özelleştirme UI'ı, arama) Story 3.3'ün kapsamıdır — bu story'de indikatörler sabit varsayılan periyotlarla eklenir.

## Kapsam

- **`packages/shared`:** `src/indicators/` — `sma`, `ema`, `rsi`, `macd`, `bollingerBands`, `stochastic` saf fonksiyonları (girdi: mum dizisi, çıktı: aynı uzunlukta zaman damgalı değer dizisi, yetersiz veri olan noktalarda `null`).
- **Web/Mobil:** Teknik Analiz sekmesine bir indikatör seçim menüsü; seçilen indikatörler grafiğe overlay (SMA/EMA/Bollinger) veya ayrı panel (RSI/MACD/Stokastik/Hacim) olarak eklenir; her eklenen indikatörün yanında tek tıkla kaldırma kontrolü.

**Kapsam dışı:**
- Parametre özelleştirme (periyot değiştirme) ve 30+ indikatörlük geniş kütüphane — Story 3.3.
- Manuel çizim araçları — Story 3.4.
- Kural bazlı sinyaller — Story 3.5.
- İndikatör seçiminin kalıcı saklanması (kullanıcı sayfayı yenilediğinde sıfırlanır) — AC'lerde kalıcılık istenmiyor; her açılışta varsayılan (indikatörsüz) grafik gösterilir.

## Görevler

1. **[Shared]** `packages/shared/src/indicators/`: `sma.ts`, `ema.ts`, `rsi.ts`, `macd.ts`, `bollinger-bands.ts`, `stochastic.ts`, `types.ts` (`OhlcvPoint`), `index.ts`.
2. **[Web]** `price-chart.tsx`'e indikatör seçim menüsü + her aktif indikatör için pane/seri yönetimi (`useEffect` ile mum verisi veya aktif indikatör listesi değiştiğinde yeniden hesaplama/çizim).
3. **[Mobil]** `PriceChartWebView.tsx`: aynı indikatör menüsü (native RN kontrolleri), hesaplanan seriler `injectJavaScript` ile WebView'e aktarılır (hesaplama RN tarafında `packages/shared` ile yapılır, WebView yalnızca çizer — WebView içindeki hesaplama tekrarını önler).

## Kabul Kriterleri

**AC1 — İndikatör ekleme**
- **Given** grafik indikatör menüsü, **When** kullanıcı bir çekirdek indikatörü (SMA, EMA, RSI, MACD, Bollinger Bantları, Hacim, Stokastik) seçerse, **Then** indikatör grafiğe overlay veya alt panel olarak eklenir (FR-021).

**AC2 — Birlikte okunabilirlik**
- **Given** birden fazla indikatör eklenmiş, **When** kullanıcı grafiği görüntülerse, **Then** tüm indikatörler okunabilir şekilde bir arada gösterilir (overlay'ler fiyat panelinde üst üste, osilatörler kendi ayrı panellerinde).

**AC3 — Tek tıkla kaldırma**
- **And** kullanıcı eklediği indikatörü tek tıkla kaldırabilir; kaldırma yalnızca o indikatörü etkiler, diğerleri ve ana fiyat grafiği bozulmadan kalır.

## Definition of Done

- [x] AC1–AC3 karşılanıyor ve doğrulandı (indikatör formülleri Node'un yerel TS desteğiyle izole bir ortamda çalıştırılıp sınır durumları (null pencere, RSI 0-100 aralığı, Bollinger üst>orta>alt, EMA'nın ani sıçramaya SMA'dan daha hızlı tepki vermesi) doğrulandı; web: typecheck/lint/build; mobil: typecheck/lint + Metro bundle (iOS)).
- [x] Yeni bir backend endpoint'i veya bağımlılık eklenmedi (yalnızca `packages/shared` içinde saf TS fonksiyonları).

## Teknik Notlar

- Standart formüller kullanıldı (SMA: basit hareketli ortalama; EMA: `2/(N+1)` katsayılı üstel ortalama; RSI: Wilder'ın 14 periyotluk ortalama kazanç/kayıp yöntemi; MACD: EMA12-EMA26 + 9 periyotluk sinyal çizgisi; Bollinger: 20 periyotluk SMA ± 2 standart sapma; Stokastik: 14 periyotluk %K + 3 periyotluk %D) — bunlar iyi belgelenmiş, tartışmasız matematiksel tanımlar olduğundan (Finnhub'ın kendine özgü alan adları gibi doğrulama gerektiren bir dış API sözleşmesi değil) ayrıca dış kaynak doğrulaması yapılmadı.
- `lightweight-charts` v5 pane API'si: yeni bir alt panel için önce `chart.addPane()` çağrılır (dönen `IPaneApi`'nin `.paneIndex()`'i alınır), sonra `chart.addSeries(type, options, paneIndex)` o pane'e seri ekler; kaldırırken `chart.removeSeries()` + `chart.removePane(index)`.
