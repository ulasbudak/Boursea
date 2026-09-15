---
title: "Story 3.3: Geniş İndikatör Kütüphanesi"
epic: "Epic 3 — Teknik Analiz ve Özet Değerlendirme Skoru"
story_id: "3.3"
status: done
created: 2026-09-15
updated: 2026-09-15
author: Bob (BMAD Scrum Master)
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md"]
depends_on: ["3.2"]
---

# Story 3.3: Geniş İndikatör Kütüphanesi

## Kullanıcı Hikayesi

As a **aktif trader**,
I want ADX, Fibonacci Retracement, Ichimoku, ATR, OBV, Parabolic SAR, Williams %R gibi ileri seviye indikatörlere erişmek,
So that daha derinlemesine teknik analiz yapabileyim.

*(Kaynak: `docs/epics.md` §7, Epic 3 — Story 3.3; PRD FR-022.)*

## Bağlam

Story 3.2'deki 7 çekirdek indikatör her zaman görünür kısayol düğmeleriydi. Bu story, ayrı bir "Gelişmiş" kategori olarak **32 indikatörlük** aranabilir bir kütüphane ekler (FR-022'nin "en az 30" şartı sağlanır). Mimari olarak Story 3.2'de kurulan indikatör render altyapısı (overlay/pane yönetimi, `packages/shared` saf hesaplama fonksiyonları) genişletilir, yeniden icat edilmez — çekirdek ve gelişmiş indikatörler artık tek bir "aktif indikatörler" listesinde birleşik olarak yönetiliyor.

**Fibonacci Retracement özel durumu:** Gerçek Fibonacci Retracement, kullanıcının grafikte iki nokta (dip/tepe) seçmesini gerektiren interaktif bir çizim aracıdır — bu, Story 3.4'ün ("Manuel Çizim Araçları") kapsamıdır. Bu story'de FR-022'nin listelediği bir "indikatör" olarak, **otomatik** bir versiyon sunulur: yüklü mum verisindeki en yüksek/en düşük noktalar arasında standart Fibonacci oranlarında (%0, %23.6, %38.2, %50, %61.8, %78.6, %100) yatay seviyeler otomatik hesaplanır. Story 3.4'te gerçek interaktif iki-nokta çizimi eklendiğinde bu, farklı bir araç olarak yan yana var olabilir.

**Parametre özelleştirme:** AC2, seçilen indikatörün parametrelerinin (örn. periyot) varsayılan değerle eklenip sonradan özelleştirilebilmesini istiyor. Arama listesindeki her indikatör satırı, eklemeden önce düzenlenebilir bir periyot alanı ile gelir; varsayılan değer önceden doldurulmuştur.

## Kapsam

- **`packages/shared`:** `src/indicators/advanced/` altında 32 indikatörün saf hesaplama fonksiyonları (gruplu dosyalar: hareketli ortalama varyantları, trend, momentum, oynaklık, hacim, Fibonacci) + bir `ADVANCED_INDICATORS` kayıt (id, ad, kategori, varsayılan parametreler, hesaplama fonksiyonu referansı).
- **Web/Mobil:** Teknik Analiz sekmesine "Gelişmiş" bölümü — arama kutusu + filtrelenmiş liste + her satırda düzenlenebilir periyot + ekle butonu; aktif gelişmiş indikatörler, çekirdek indikatörlerle aynı render boru hattını (overlay/pane) paylaşır ve aynı şekilde tek tıkla kaldırılabilir.

**Kapsam dışı:**
- Gerçek interaktif iki-nokta Fibonacci çizimi ve diğer manuel çizim araçları — Story 3.4.
- İndikatör kombinasyonlarından otomatik sinyal üretimi — Story 3.5.

## İndikatör Listesi (32)

**Trend:** ADX (+DI/-DI dahil), Parabolic SAR, Ichimoku Bulutu, Aroon Up/Down, Aroon Osilatörü, Vortex, TRIX, SuperTrend, WMA, HMA, DEMA, TEMA, KAMA
**Momentum:** Williams %R, CCI, ROC, Momentum, Ultimate Osilatör, Awesome Osilatör, CMO (Chande Momentum Osilatörü), TSI (True Strength Index)
**Oynaklık:** ATR, Standart Sapma, Keltner Kanalları, Donchian Kanalları
**Hacim:** OBV, Chaikin Money Flow, Money Flow Index, Akümülasyon/Dağıtım Hattı, VWAP, Force Index
**Diğer:** Fibonacci Retracement (otomatik, bkz. Bağlam)

## Görevler

1. **[Shared]** `packages/shared/src/indicators/advanced/moving-averages.ts` (wma, hma, dema, tema, kama), `trend.ts` (adx, parabolicSar, ichimoku, aroon, aroonOscillator, vortex, trix, superTrend), `momentum.ts` (williamsR, cci, roc, momentum, ultimateOscillator, awesomeOscillator, cmo, tsi), `volatility.ts` (atr, standardDeviation, keltnerChannels, donchianChannels), `volume.ts` (obv, chaikinMoneyFlow, moneyFlowIndex, accumulationDistribution, vwap, forceIndex), `fibonacci.ts` (fibonacciRetracement).
2. **[Shared]** `registry.ts`: `ADVANCED_INDICATORS` — her biri için `{id, name, category, defaultParams, overlay, compute}`.
3. **[Web]** `price-chart.tsx`: çekirdek+gelişmiş indikatörleri birleşik bir `activeIndicators` listesinde yönetecek şekilde genişletildi; yeni `advanced-indicator-picker.tsx` (arama + parametre girişi + ekle).
4. **[Mobil]** `PriceChartWebView.tsx`: aynı birleşik indikatör listesi + arama/parametre UI'ı (native RN bileşenleri).

## Kabul Kriterleri

**AC1 — Aranabilir, en az 30 indikatörlük liste**
- **Given** indikatör kütüphanesi menüsü, **When** kullanıcı "Gelişmiş" kategorisini açarsa, **Then** en az 30 indikatör (bu story'de 32) aranabilir bir liste halinde sunulur (FR-022).

**AC2 — Varsayılan parametreyle ekleme + özelleştirme**
- **Given** bir indikatör seçilir, **When** parametreleri (örn. periyot) varsayılan değerlerle eklenirse, **Then** kullanıcı ekleme öncesi parametreyi özelleştirebilir.

**AC3 — Birleşik render/kaldırma (Story 3.2 ile tutarlılık)**
- **And** eklenen gelişmiş indikatörler, çekirdek indikatörlerle aynı şekilde (overlay veya ayrı panel) gösterilir ve tek tıkla kaldırılabilir.

## Definition of Done

- [x] AC1–AC3 karşılanıyor ve doğrulandı (32 gelişmiş + 7 çekirdek = 39 indikatörün tamamı izole bir Node ortamında smoke-test edildi: her biri gerçekçi/kısa/boş mum dizileriyle çalıştırılıp çökme yok, `NaN`/`Infinity` yok doğrulandı; ayrıca sınırlı indikatörler için (Williams %R, Aroon, CMO, MFI, ADX, Vortex, SuperTrend, Parabolic SAR) değer aralığı/işaret kontrolleri ayrıca koşuldu; web: typecheck/lint/build; mobil: typecheck/lint + Metro bundle (iOS)).
- [x] Yeni bir backend endpoint'i veya bağımlılık eklenmedi.
- [x] **Kapsam notu:** Story 3.2'nin 7 çekirdek indikatörü, bu story sırasında aynı `IndicatorDefinition` sözleşmesine taşınarak (`core-registry.ts`) 32 gelişmiş indikatörle birleşik tek bir `ALL_INDICATORS` kaydına (`registry.ts`) dönüştürüldü; `price-chart.tsx`/`PriceChartWebView.tsx` artık tek bir render boru hattı kullanıyor (önceki iki paralel sistem yerine). Bu, orijinal görev listesinde açıkça yazmayan ama doğal bir genişleme olan bir refactor'dür.

## Teknik Notlar

- Tüm formüller iyi belgelenmiş, standart teknik analiz tanımlarıdır (Wilder'ın ADX/ATR/Parabolic SAR yöntemleri, Ichimoku'nun standart 9/26/52 periyotları vb.); Finnhub gibi doğrulama gerektiren bir dış API sözleşmesi olmadığından ayrıca web araştırması yapılmadı, yalnızca hesaplama sonuçları (aralık/işaret/karşılaştırma sınır testleri) izole bir Node script'i ile doğrulandı.
- Fibonacci Retracement, story'nin geri kalanından farklı olarak zaman serisi değil, iki fiyat seviyesi (yükseklik/düşüklük) + bunlardan türetilmiş 7 sabit yatay çizgi döner; grafikte `PriceLine` olarak çizilir (seri değil).
