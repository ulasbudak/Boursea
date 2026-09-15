---
title: "Story 3.1: İnteraktif Fiyat Grafiği"
epic: "Epic 3 — Teknik Analiz ve Özet Değerlendirme Skoru"
story_id: "3.1"
status: done
created: 2026-09-15
updated: 2026-09-15
author: Bob (BMAD Scrum Master)
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md"]
depends_on: ["1.5"]
---

# Story 3.1: İnteraktif Fiyat Grafiği

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want mum/çizgi/bar grafik türleri arasında geçiş yapıp farklı zaman dilimlerinde fiyat grafiğini incelemek,
So that fiyat hareketini istediğim şekilde analiz edebileyim.

*(Kaynak: `docs/epics.md` §7, Epic 3 — Story 3.1; PRD FR-020.)*

Bu, Epic 3'ün (Teknik Analiz) ilk story'sidir ve `architecture.md` AD-9'u (tek grafik motoru: TradingView Lightweight Charts) ilk kez hayata geçirir.

## Bağlam

**Grafik motoru:** `lightweight-charts` v5 kuruldu (web'de native `npm` paketi). v5 API'si `chart.addSeries(CandlestickSeries | LineSeries | BarSeries, options)` şeklindedir (eski v3/v4'teki `addCandlestickSeries()` gibi ayrı metodlar değil) — kurulan paketin `dist/typings.d.ts` dosyasından doğrulandı. Mobilde AD-9'un öngördüğü gibi **WebView köprüsü** kullanılır (`react-native-webview`): grafik motoru bir HTML sayfası içinde (CDN'den yüklenen `lightweight-charts.standalone.production.js`) çalışır, veri ve kontrol olayları `postMessage`/`injectJavaScript` ile taşınır — web ve mobil aynı normalize edilmiş mum verisi sözleşmesini (`{time, open, high, low, close}`) tüketir.

**Veri kaynağı riski (şeffafça belgelenmesi gereken bir gerçek dünya kısıtı):** Finnhub'ın ücretsiz katmanında ABD hisseleri için `/stock/candle` endpoint'inin erişilebilirliği **tutarsız** — Finnhub'ın kendi GitHub deposunda (`finnhubio/Finnhub-API` #546, 2025) ücretsiz plan kullanıcılarının bu endpoint'e erişimin önceden çalışırken sonradan "You don't have access to this resource" hatası aldığı bildiriliyor; resmi bir çözüm/açıklama yok. Bu story, `architecture.md`'de MVP için zaten seçilmiş olan tek sağlayıcıyı (Finnhub) kullanmaya devam eder ve **Story 1.4/1.5/2.1'deki ile birebir aynı savunmacı deseni** uygular: istek başarısız olursa (403/hata/`"s": "no_data"`) sessiz bir boşluk yerine "veri şu an güncellenemiyor" uyarısı (NFR-2). Gerçek kullanımda bu endpoint tutarlı biçimde erişilemez olursa, Polygon.io'ya geçiş (`architecture.md`'de zaten "Premium/ölçek" için öngörülmüş) ayrı bir mimari karar/story olarak ele alınmalı — bu story o kararı vermez.

**BIST:** Aynı tutarlı MVP kararı — gerçek zamanlı/lisanslı BIST mum verisi kaynağı tanımlı değil; boş seri + uyarı döner.

## Kapsam

- **Backend:** `app/market_data.py`'ye `CandlePoint` modeli ve `get_us_candles()`/`get_bist_candles()`; yeni `GET /symbols/candles?symbol=&exchange=&timeframe=` endpoint'i. `timeframe`: `intraday` (60dk çözünürlük, son 5 gün) / `daily` (günlük, son 1 yıl) / `weekly` (haftalık, son 5 yıl) / `monthly` (aylık, son 20 yıl) — FR-020'nin "gün içi/günlük/haftalık/aylık" ifadesine eşlenir.
- **Web:** `price-chart.tsx` — `lightweight-charts` ile mum/çizgi/bar grafik türü ve zaman dilimi araç çubuğu; hisse detay sayfasına yeni "Teknik Analiz" sekmesi.
- **Mobil:** Aynı davranış, `react-native-webview` köprüsü üzerinden.

**Kapsam dışı:**
- İndikatörler (SMA/EMA/RSI/MACD/Bollinger vb.) — Story 3.2/3.3.
- Manuel çizim araçları — Story 3.4.
- Kural bazlı sinyaller ve özet skor — Story 3.5/3.6.
- Mum verisinin önbelleklenmesi/DB'de saklanması (`candles` tablosu, AD-6) — bu proje henüz hiç Postgres migration altyapısı kurmadı (Story 2.1/2.2/2.3 ile tutarlı bilinçli MVP kararı); istek anında Finnhub'dan çekilir.

## Mimari Yaklaşım

- Yeni fonksiyonlar `market_data` modülüne eklenir (mimari FR haritasında FR-020 zaten bu modüle atanmış: "market_data: ... FR-001, FR-002, **FR-020**").
- `CandlePoint` normalize edilmiş model; Finnhub'ın `{t, o, h, l, c, v, s}` dizi-tabanlı ham formatı yalnızca `get_us_candles()` içinde ayrıştırılır (AD-5).
- Web ve mobil, aynı `/symbols/candles` sözleşmesini tüketir; grafik motoru API'si (v5 `addSeries`) her iki platformda da aynıdır — web native import, mobil WebView içinde CDN script.
- Sekme yapısı Story 2.1'deki `StockTabs` deseni genişletilir: "Genel Bakış" / "Temel Analiz" / **"Teknik Analiz"**.

## Görevler

1. **[Backend]** `app/market_data.py`: `CandlePoint`, timeframe→(resolution, lookback) eşlemesi, `get_bist_candles()`, `get_us_candles()`.
2. **[Backend]** `GET /symbols/candles` endpoint'i: geçersiz `timeframe`/`exchange` için 400; BIST için boş + uyarı; ABD hata durumunda boş + uyarı.
3. **[Backend]** Birim testleri: her timeframe için doğru `resolution`/`from`/`to` parametreleri, başarılı ayrıştırma, `"s": "no_data"` senaryosu, HTTP hatası, BIST, endpoint testleri.
4. **[Web]** `lightweight-charts` paketi kuruldu; `price-chart.tsx` (mum/çizgi/bar + zaman dilimi araç çubuğu, `chart.addSeries`/`removeSeries` ile tür değişimi); `StockTabs`'e "Teknik Analiz" sekmesi.
5. **[Mobil]** `react-native-webview` kuruldu; `PriceChartWebView.tsx` (HTML string içinde CDN'den yüklenen lightweight-charts, `postMessage` ile veri/kontrol); `StockOverviewScreen`'e üçüncü sekme.

## Kabul Kriterleri

**AC1 — Varsayılan mum grafiği**
- **Given** hisse detay sayfasının "Teknik Analiz" sekmesi, **When** kullanıcı sekmeyi açarsa, **Then** TradingView Lightweight Charts ile mum grafiği varsayılan olarak, varsayılan "günlük" zaman diliminde gösterilir (AD-9).

**AC2 — Anında tür/zaman dilimi değişimi**
- **Given** grafik araç çubuğu, **When** kullanıcı grafik türünü (mum/çizgi/bar) veya zaman dilimini (gün içi/günlük/haftalık/aylık) değiştirirse, **Then** grafik anında güncellenir (FR-020).

**AC3 — Platformlar arası aynı veri sözleşmesi**
- **And** grafik hem web hem mobilde aynı `/symbols/candles` veri sözleşmesiyle çalışır (mobilde WebView köprüsü üzerinden).

**AC4 — Veri erişilemezliği sessiz geçilmez**
- **Given** mum verisi sağlayıcısı erişilemezse (BIST henüz desteklenmiyor, veya Finnhub isteği başarısız/`no_data` dönerse), **When** grafik açılırsa, **Then** boş bir grafik yerine "veri şu an güncellenemiyor" uyarısı gösterilir (NFR-2).

## Definition of Done

- [x] AC1–AC4 karşılanıyor ve doğrulandı (backend: pytest 64/64 yeşil + canlı `uvicorn` smoke test; web: typecheck/lint/build — `lightweight-charts` v5 API kullanımı typecheck ile doğrulandı; mobil: typecheck/lint + Metro bundle (iOS + Android) — `react-native-webview` ref API'si typecheck ile doğrulandı).
- [x] `FINNHUB_API_KEY` olmadan da uygulama çökmüyor.
- [x] Yeni ortam değişkeni gerekmedi (mevcut `FINNHUB_API_KEY` yeniden kullanıldı); yeni bağımlılıklar: web'e `lightweight-charts`, mobile'a `react-native-webview`.

## Teknik Notlar

- Finnhub `/stock/candle?symbol=&resolution=&from=&to=&token=` → `{"c":[...], "h":[...], "l":[...], "o":[...], "s":"ok"|"no_data", "t":[...], "v":[...]}` (uzun süredir stabil, çok kaynakla doğrulanan bir sözleşme); `s != "ok"` durumu hata olarak ele alınır.
- `lightweight-charts` v5: seri eklemek için `chart.addSeries(CandlestickSeries | LineSeries | BarSeries, options)` (paketin kendi `dist/typings.d.ts`'inden doğrulandı); grafik türü değiştiğinde önceki seri `chart.removeSeries()` ile kaldırılıp yenisi eklenir (bir serinin türü yerinde değiştirilemez).
- Mobilde WebView içine CDN'den (`unpkg`) yüklenen `lightweight-charts.standalone.production.js` kullanılır; bu, çevrimdışı ilk açılışta grafiğin yüklenememesi riski taşır — MVP için kabul edilebilir, ileride yerel bundling değerlendirilebilir.
