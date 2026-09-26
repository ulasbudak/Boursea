---
title: "Story 1.6: BIST'in Geçici Olarak Devre Dışı Bırakılması"
epic: "Epic 1 — Kimlik Doğrulama, Hisse Keşfi ve Temel Altyapı"
story_id: "1.6"
status: done
created: 2026-09-26
updated: 2026-09-26
author: Claude (kullanıcı isteğiyle, 2026-09-26)
based_on: ["docs/PRD.md §3 (2026-09-26 güncellemesi)", "docs/stories/story-1.4.md", "docs/stories/story-1.5.md"]
depends_on: ["1.4", "1.5"]
---

# Story 1.6: BIST'in Geçici Olarak Devre Dışı Bırakılması

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want uygulamanın yalnızca veri sunabildiği borsaları göstermesini ve BIST'in neden olmadığını açıkça söylemesini,
So that veri gelmeyen boş hisse sayfalarına düşmeyeyim.

## Bağlam

Canlı bir BIST fiyat kaynağı yok (bkz. PRD FR-041, `docs/architecture.md`). BIST sembolleri aramada görünüyordu ama fiyat, grafik, sinyal, tarama, simülasyon ve AI raporlarının hiçbiri BIST için çalışmıyordu. Kullanıcı 2026-09-26'da BIST'in şimdilik devre dışı bırakılmasını ve bunun uygulamada belirtilmesini istedi.

Doğrulama sırasında ayrı ama ilişkili bir sorun bulundu: Finnhub'ın sembol araması, `exchange` parametresi verilmediğinde yabancı kotasyonları da döndürüyordu (`GARAN.E.IS`, `AAPL.TO`, `MSFT.L`…). Uygulama bunları "US" etiketiyle gösteriyordu, oysa hiçbiri için veri yoktu. BIST kapalıyken "GARAN" araması bu yüzden yine Türk hisselerini "ABD hissesi" olarak listeliyordu.

## Kapsam

- **Tek bayrak:** `BIST_ENABLED = False` — API'de `app/market_data.py`, frontend'lerde `@borocean/shared` (`packages/shared/src/exchanges.ts`). İkisi birlikte `True` yapılarak geri açılır.
- **API:** `/symbols/search` BIST sonuçlarını döndürmez (`exchange=BIST` istenirse açıklayıcı uyarı döner); `/symbols/overview` BIST için "devre dışı" uyarısı döner; screener `ALL`'da BIST'i atlar, `BIST`'te uyarı döner. Finnhub aramasına `exchange=US` eklendi (yabancı kotasyonlar artık "US" diye görünmüyor).
- **Web:** Screener, simülasyon ve portföy formlarındaki BIST seçeneği gizlendi; arama kutusunun ve screener'ın altında "Borsa İstanbul (BIST) şu an devre dışı — şimdilik yalnızca ABD hisseleri destekleniyor." notu; BIST hisse sayfasında (eski linkler/izleme listeleri) uyarı gösterilir ve aksiyon butonları (izleme listesi, alarmlar, simülasyon) gizlenir. Arama örneği "GARAN" → "AAPL" oldu.
- **Mobil:** Aynı seçenek gizleme ve notlar (`ScreenerScreen`, `SimulationScreen`, `PortfolioScreen`, `SearchBox`).

**Kapsam dışı:** Kullanıcıların mevcut BIST kayıtları (izleme listesi öğeleri, alarmlar, portföy pozisyonları) silinmedi; mevcut "BIST için veri yok" ipuçlarıyla görünmeye devam eder.

## Görevler

1. **[Backend]** `BIST_ENABLED` bayrağı + arama/overview/screener davranışı + testler (conftest'te mevcut BIST testleri için bayrak açık, yeni testler kapalı davranışı doğrular). ✅
2. **[Backend]** Finnhub aramasına `exchange=US`. ✅
3. **[Shared]** `BIST_ENABLED`, `search.bistDisabledNote`, `screener.bistDisabledNote` (tr/en). ✅
4. **[Web]** Seçenek gizleme, notlar, BIST hisse sayfası aksiyonlarının gizlenmesi. ✅
5. **[Mobil]** Seçenek gizleme ve notlar. ✅

## Kabul Kriterleri

- **Given** BIST devre dışı, **When** kullanıcı "GARAN" ararsa, **Then** BIST sonucu da, "US" etiketli yabancı kotasyon da gelmez; arama kutusunun altındaki not BIST'in devre dışı olduğunu söyler.
- **Given** screener/simülasyon/portföy formları, **When** borsa seçilirse, **Then** BIST seçeneği yoktur.
- **Given** eski bir BIST hisse linki, **When** açılırsa, **Then** "şu an devre dışı" uyarısı görünür ve alarm/simülasyon aksiyonları sunulmaz.

## Definition of Done

- [x] Backend testleri yeşil (325/325), ruff temiz.
- [x] Web ve mobil typecheck + lint temiz.
- [x] **Gerçek tarayıcıda doğrulandı** (2026-09-26, Playwright, yerel web + API, dev Supabase test kullanıcısı): "GARAN" araması sonuçsuz, "MSFT" yalnızca `US MSFT`; screener seçenekleri `["Tümü", "ABD"]`; `/stock/BIST/GARAN` uyarıyı gösteriyor, aksiyon butonu yok; açık ve koyu temada konsol/ağ hatası yok.
- [ ] Mobil cihaz/simülatör doğrulaması — bu ortamda yok.
