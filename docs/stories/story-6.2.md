---
title: "Story 6.2: Portföy Değeri ve Kâr/Zarar Hesaplama"
epic: "Epic 6 — Portföy Takibi"
story_id: "6.2"
status: done
created: 2026-09-18
updated: 2026-09-18
author: Bob (BMAD Scrum Master) & Amelia (BMAD Developer)
based_on: ["docs/PRD.md", "docs/architecture.md §7", "docs/epics.md §10"]
depends_on: ["6.1"]
---

# Story 6.2: Portföy Değeri ve Kâr/Zarar Hesaplama

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want portföyümün anlık toplam değerini ve pozisyon bazlı kâr/zararımı görmek,
So that yatırım performansımı takip edebileyim.

*(Kaynak: `docs/epics.md` §10, Epic 6 — Story 6.2; PRD FR-051.)*

## Bağlam

Story 5.2/5.3'teki "istek-anında değerlendirme" deseni (`evaluate_and_persist`, Celery yok) burada `value_portfolios()` olarak tekrarlanıyor — ama bir farkla: alarmlar bir *durumu* kalıcı hale getirirken (`status='triggered'`), portföy değerlemesi tamamen **türetilmiş, anlık** bir hesaplama; hiçbir şey DB'ye yazılmıyor. Her `GET /portfolios` çağrısında pozisyonların güncel fiyatı yeniden çekilip piyasa değeri/kâr-zarar sıfırdan hesaplanıyor.

**Aynı BIST kısıtı, biraz farklı sonuç:** `get_bist_overview()` fiyat alanı döndürmediği için (Story 1.4'ten beri tutarlı mimari karar) BIST pozisyonları **her zaman** `price_unavailable=true` — kurulabilirler (adet+ortalama maliyet saklanır, Story 6.1) ama hiçbir zaman değerlenemezler. AC2'nin kritik kısıtı burada uygulandı: fiyatı alınamayan bir pozisyon **sıfır değermiş gibi toplama dahil edilmiyor**, tamamen **hariç tutuluyor** — böylece "AAPL fiyatı çekilemedi" durumu portföyün gerçek değerini yanlışlıkla düşük göstermiyor.

## Kapsam

**Bu PR'da tamamlanan (Story 6.1 ile aynı PR/commit'te):**
- **Backend:** `app/portfolios.py::value_portfolios()` — her pozisyon için canlı fiyat (`get_us_overview`, sembol başına önbellekli — aynı sembolden birden fazla pozisyon varsa tekrar Finnhub çağrısı yapılmaz), piyasa değeri, gerçekleşmemiş kâr/zarar ($ ve %); portföy toplamları yalnızca değerlenebilen pozisyonlardan hesaplanır.
- **Web/Mobil:** Pozisyon tablosunda güncel fiyat/değer/kâr-zarar sütunları (yeşil/kırmızı renklendirme — `ChangeValue`/`signColor`); değerlenemeyen pozisyonlar için "Fiyat alınamadı" / BIST için açıklayıcı ipucu metni.

**Kapsam dışı:**
- Portföy değerinin zaman içindeki grafiği/geçmişi — yalnızca anlık durum.
- Çoklu para birimi normalizasyonu (TL/USD karışık toplam) — tüm hesaplama tek bir para biriminde (`formatPrice(..., "USD", ...)`) gösteriliyor; BIST zaten değerlenemediği için bu an itibarıyla pratik bir çatışma yok, ama TL fiyatlı bir BIST canlı veri kaynağı eklendiğinde (gelecekteki bir story) bu normalizasyon kararı yeniden ele alınmalı.

## Görevler

1. **[Backend]** `value_portfolios()`: sembol-başına önbellekli canlı fiyat çekme, piyasa değeri/kâr-zarar hesabı, BIST/hata durumunda `price_unavailable` işaretleme. ✅
2. **[Backend]** Portföy toplamları yalnızca değerlenebilen pozisyonlardan hesaplanacak şekilde uygulandı (AC2'nin "toplam yanlış gösterilmez" koşulu). ✅
3. **[Backend]** Testler: fiyat mevcut/yok/BIST senaryoları, toplam hesaplama, uyarı mesajları (`UNAVAILABLE_WARNING`, `BIST_UNAVAILABLE_WARNING`). ✅
4. **[Web]** Pozisyon tablosunda güncel fiyat/değer/kâr-zarar sütunları + portföy toplamı özeti. ✅
5. **[Mobil]** Aynı bilgiler `PortfolioScreen` pozisyon satırlarında. ✅

## Kabul Kriterleri

**AC1 — Anlık değer/kâr-zarar**
- **Given** portföy ekranı, **When** güncel fiyatlar değişirse, **Then** toplam portföy değeri ve her pozisyonun kâr/zararı ($ ve %) güncellenir (FR-051).

**AC2 — Veri eksikliğinde güvenli davranış**
- **Given** bir pozisyonun güncel fiyatı çekilemezse, **When** hesaplama yapılırsa, **Then** o pozisyon "veri güncellenemiyor" olarak işaretlenir, toplam yanlış gösterilmez (fiyatsız pozisyon toplamdan hariç tutulur, sıfır değermiş gibi dahil edilmez).

## Definition of Done

- [x] AC1–AC2 karşılanıyor ve doğrulandı (bkz. `story-6.1.md` DoD — aynı canlı uçtan uca test bu story'nin değerleme mantığını da kapsıyor: AAPL için gerçek Finnhub fiyatı [337.00] ile market_value=6740, pnl_abs=3740, pnl_pct≈124.67 doğrulandı; GARAN/BIST için `price_unavailable=true` ve toplamdan hariç tutulma doğrulandı).
- [x] Backend testleri yeşil (`test_value_portfolios_*` — 3 senaryo: fiyat mevcut, fiyat yok, BIST) + ruff temiz.
- [ ] Gerçek tarayıcıda/cihazda görsel doğrulama — kullanıcı bizzat denemeli.

## Teknik Notlar

- **Fiyat önbelleği yalnızca tek bir `GET /portfolios` çağrısı ömrüyle sınırlı** (`price_cache: dict[str, float | None]` fonksiyon-içi yerel değişken) — Story 4.1'in screener'ındaki 30dk'lık işlem-içi TTL önbellekten farklı olarak burada kalıcı bir önbellek yok; her istek taze fiyat çeker. Aynı sembolden birden fazla pozisyon/portföy varsa (örn. iki farklı portföyde AAPL), o istek içinde yalnızca bir kez Finnhub'a gidilir.
- Diğer tüm mimari kararlar Story 5.2 ile aynı (`evaluate_and_persist` deseninin türetilmiş/yazmasız versiyonu).
