---
title: "Story 10.3: Hisse Sayfasından Simülasyonda Alım"
epic: "Epic 10 — Alım-Satım Simülasyonu (Paper Trading)"
story_id: "10.3"
status: done
created: 2026-09-26
updated: 2026-09-26
author: Claude (kullanıcı isteğiyle, 2026-09-26)
based_on: ["docs/stories/story-10.1.md"]
depends_on: ["10.1"]
---

# Story 10.3: Hisse Sayfasından Simülasyonda Alım

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want incelediğim bir hisseyi, sayfadan ayrılmadan simülasyonuma almak,
So that bir fikri test etmek için simülasyon ekranına gidip sembolü yeniden aramak zorunda kalmayayım.

## Bağlam

Story 10.1'de emir vermek yalnızca `/simulation` sayfasındaki formdan mümkündü. Kullanıcı 2026-09-26'da hisse sayfasındayken "simülasyonda satın al" gibi bir seçenek istedi. Backend değişikliği gerekmedi — `GET /simulations`, `POST /simulations` ve `POST /simulations/{id}/orders` zaten vardı.

## Kapsam

- **Web:** `apps/web/src/app/stock/[exchange]/[symbol]/simulate-buy-button.tsx` — hisse başlığındaki aksiyonlara, fiyat alarmı butonuyla aynı açılır panel deseninde "Simülasyonda al". Panel: simülasyon seçimi, kullanılabilir nakit, adet, anlık fiyattan tahmini tutar, "gerçek piyasa fiyatından yürütülür" notu. Hiç simülasyon yoksa tek tıkla "Simülasyonum" (10.000 USD) oluşturup devam etme. Başarıda mesaj + "Simülasyona git" bağlantısı; nakit bakiyesi mesajla birlikte güncellenir. API hataları (örn. "Yetersiz bakiye…") panelde gösterilir.
- **Yalnızca ABD hisseleri:** Simülatör canlı ABD fiyatlarıyla çalışır (Story 10.1); buton başka borsalarda görünmez.
- **i18n:** `simulation.buyFromStock*`, `selectSimulationLabel`, `cashAvailable`, `estimatedCost`, `buyButton`, `buying`, `buySuccess`, `goToSimulation`, `quickCreate*`, `defaultSimulationName` (tr/en).
- Aynı çalışmada hisse sayfası başlık satırı `flex-wrap` yapıldı: dört buton başlığın yanına sığmadığında alt satıra geçiyor, "Apple Inc" artık ikiye bölünmüyor.

**Kapsam dışı:** Satış (satış, pozisyonun durduğu simülasyon sayfasında kalıyor); mobil `StockOverviewScreen` karşılığı (mobil yayın şu an kapsam dışı).

## Görevler

1. **[Web]** `SimulateBuyButton` bileşeni + hisse sayfasına bağlanması. ✅
2. **[Shared]** i18n anahtarları. ✅
3. **[Mobil]** — kapsam dışı bırakıldı. ☐

## Kabul Kriterleri

- **Given** bir ABD hissesinin detay sayfası, **When** kullanıcı "Simülasyonda al"a tıklayıp adet girerse, **Then** emir o anki gerçek fiyattan yürütülür ve nakit bakiyesi güncellenir.
- **Given** hiç simülasyonu olmayan bir kullanıcı, **When** paneli açarsa, **Then** tek tıkla bir simülasyon oluşturup aynı panelde alıma devam edebilir.
- **Given** nakit yetmiyorsa, **When** emir verilirse, **Then** API'nin "Yetersiz bakiye" mesajı gösterilir, bakiye değişmez.

## Definition of Done

- [x] Web typecheck + lint temiz.
- [x] **Gerçek tarayıcıda doğrulandı** (2026-09-26, Playwright, yerel web + API, gerçek AAPL fiyatı, dev Supabase test kullanıcısı): hızlı oluşturma → nakit 10.000 $; 2 adet AAPL alımı → bakiye tam 682,14 $ (2 × 341,07 $) düştü, başarı mesajı ve simülasyon bağlantısı göründü; 100.000 adet → "Yetersiz bakiye" mesajı; `/simulation` sayfasında AAPL pozisyonu; 390 px genişlikte yatay taşma yok. Test kullanıcısı ve verisi sonrasında silindi.
- [ ] Mobil karşılık — kapsam dışı.
