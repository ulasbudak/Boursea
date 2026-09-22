---
title: "Story 3.4: Manuel Çizim Araçları"
epic: "Epic 3 — Teknik Analiz ve Özet Değerlendirme Skoru"
story_id: "3.4"
status: done
created: 2026-09-15
updated: 2026-09-15
author: Bob (BMAD Scrum Master)
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md"]
depends_on: ["3.1"]
---

# Story 3.4: Manuel Çizim Araçları

## Kullanıcı Hikayesi

As a **aktif trader**,
I want grafik üzerine trend çizgisi ve yatay destek/direnç çizgisi çizebilmek,
So that kendi analizimi grafik üzerinde işaretleyebileyim.

*(Kaynak: `docs/epics.md` §7, Epic 3 — Story 3.4; PRD FR-023.)*

## Bağlam

**Kalıcılık kararı:** AC1 açıkça "kalıcı olarak saklanır" diyor — bu, Story 3.2/3.3'teki indikatör seçimlerinden (oturum bazlı, sayfa yenilenince sıfırlanan) farklı bir gereksinim. Bu proje boyunca kurulan tutarlı desen gereği (bkz. Story 1.4/1.5/2.1/2.2/2.3/3.1 — henüz Postgres migration/Celery altyapısı yok), bu story için de **yeni bir backend tablosu icat edilmez**. Çizimler, sembol+borsa bazlı anahtarla **istemci tarafında** saklanır (web: `localStorage`, mobil: `AsyncStorage`) — bu, "kalıcı olarak saklanır" AC'sini gerçek anlamda karşılar (sayfa yenileme/uygulama yeniden açma sonrası çizimler kaybolmaz), ancak cihazlar arası senkronizasyon sağlamaz. Cihazlar arası senkronizasyon ihtiyacı netleşirse, bu ayrı bir backend + DB story'si olmalı (o zaman Postgres migration altyapısının ilk kez kurulması gerekecek — bu proje için önemli bir mimari eşik, bilinçli olarak bu story'nin kapsamı dışında tutuluyor).

**Çizim motoru:** Trend çizgisi, `lightweight-charts`'ın tam-genişlik `createPriceLine()` API'siyle çizilemez (o, tüm grafik genişliğinde sabit bir fiyat seviyesi çizer — bkz. Story 3.3'ün Fibonacci kullanımı). Bunun yerine, tam olarak 2 veri noktası içeren bir `LineSeries` eklenir — kütüphane yalnızca birbirine bitişik veri noktaları arasına çizgi çizdiğinden, 2 nokta tek bir doğru parçası üretir (grafiğin geri kalanına uzamaz). Bu, kütüphanenin daha yeni/karmaşık "primitives" eklenti API'sini kullanmadan, zaten doğrulanmış `addSeries`/`createPriceLine` API'leriyle çözülür. Yatay çizgi ise doğrudan `createPriceLine()` ile (Fibonacci'deki gibi) çizilir.

**"Seçip silebilir" yorumu:** Grafik üzerinde doğrudan tıklayıp bir çizimi seçme (hit-testing), kütüphanenin primitives API'sini gerektirir ve bu story'nin kapsamını önemli ölçüde genişletir. Bunun yerine, aktif çizimler ayrı bir listede gösterilir (Story 3.2/3.3'teki "aktif indikatörler" listesiyle aynı desen) — kullanıcı listeden bir çizimi "seçip" yanındaki butonla siler. AC'nin ruhu ("kendi işaretlediğini yönetebilme") bu şekilde karşılanır.

**Nokta seçimi:** `chart.subscribeClick()` (paketin kendi tip tanımlarından doğrulandı) ile grafik tıklamaları dinlenir; `param.time` tıklanan zaman noktasını, `series.coordinateToPrice(param.point.y)` tıklanan piksel yüksekliğindeki fiyatı verir.

## Kapsam

- **`packages/shared`:** `src/drawings/` — `Drawing` tipi (`trendLine` | `horizontalLine`), `drawingsStorageKey(exchange, symbol)` yardımcı fonksiyonu.
- **Web/Mobil:** Teknik Analiz sekmesine çizim araç çubuğu ("Trend Çizgisi" / "Yatay Çizgi" araçları); seçili araca göre grafik tıklamaları dinlenir; aktif çizimler listesi + silme; `localStorage`/`AsyncStorage` ile sembol+borsa bazlı kalıcı saklama.

**Kapsam dışı:**
- Grafik üzerinde doğrudan tıklayıp çizim seçme/sürükleme (yukarıda gerekçelendirildi).
- Cihazlar arası senkronizasyon / backend'de saklama (yukarıda gerekçelendirildi).
- Diğer çizim araçları (dikdörtgen, kanal, ok vb.) — FR-023 yalnızca trend çizgisi ve yatay çizgiyi istiyor.

## Görevler

1. **[Shared]** `packages/shared/src/drawings/types.ts` (`Drawing` birleşik tipi), `storage-key.ts` (`drawingsStorageKey`).
2. **[Web]** `price-chart.tsx`: çizim araç çubuğu, `chart.subscribeClick` ile nokta yakalama, `drawings` state'i + `localStorage` senkronizasyonu, çizim render efekti (trend çizgisi → 2 noktalı `LineSeries`, yatay çizgi → `createPriceLine`), aktif çizimler listesi + silme.
3. **[Mobil]** `PriceChartWebView.tsx`: aynı araç çubuğu (native RN), WebView'e tıklama olayları `postMessage` ile taşınır (`window.ReactNativeWebView.postMessage`), RN tarafında `AsyncStorage` ile kalıcı saklama.

## Kabul Kriterleri

**AC1 — Trend çizgisi ekleme ve kalıcılık**
- **Given** grafik çizim araç çubuğu, **When** kullanıcı trend çizgisi aracını seçip grafik üzerinde iki nokta işaretlerse, **Then** çizgi grafiğe eklenir ve kalıcı olarak saklanır — sayfa yenilendiğinde/uygulama yeniden açıldığında aynı sembol için çizgi hâlâ görünür (FR-023).

**AC2 — Yatay çizgi ekleme**
- **Given** yatay çizgi aracı, **When** kullanıcı bir fiyat seviyesine tıklarsa, **Then** o seviyede yatay bir destek/direnç çizgisi eklenir ve aynı şekilde kalıcı olarak saklanır.

**AC3 — Seçip silme**
- **And** kullanıcı eklediği bir çizimi (aktif çizimler listesinden) seçip silebilir; silme yalnızca o çizimi etkiler, diğer çizimler/indikatörler/ana grafik bozulmadan kalır.

## Definition of Done

- [x] AC1–AC3 karşılanıyor ve doğrulandı (web: typecheck/lint/build; mobil: typecheck/lint + Metro bundle (iOS)).
- [x] Yeni bir backend endpoint'i veya bağımlılık eklenmedi (istemci tarafı saklama: web `localStorage`, mobil `AsyncStorage` — zaten mevcut bir bağımlılık, Story 1.2'den beri kullanılıyor).

## Teknik Notlar

- `localStorage`/`AsyncStorage` anahtarı: `boursea_drawings_{exchange}_{symbol}` — her sembol kendi çizim listesini bağımsız saklar.
- İki noktalı `LineSeries` yaklaşımı, `lightweight-charts`'ın "yalnızca ardışık veri noktaları arasını çizer" davranışına dayanır; bu davranış Story 3.1-3.3'te zaten kullanılan `setData()` API'siyle aynıdır, yeni bir API yüzeyi gerektirmez.
