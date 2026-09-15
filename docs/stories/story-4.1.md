---
title: "Story 4.1: Çoklu Kriter Tarama"
epic: "Epic 4 — Tarama (Screener) ve Karşılaştırma"
story_id: "4.1"
status: review
created: 2026-09-15
updated: 2026-09-15
author: Bob (BMAD Scrum Master)
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md"]
depends_on: ["2.1", "3.5"]
---

# Story 4.1: Çoklu Kriter Tarama

## Kullanıcı Hikayesi

As a **aktif trader**,
I want piyasa değeri, F/K, RSI, hacim, sektör, borsa gibi kriterleri birleştirerek hisse taraması yapmak,
So that yatırım kriterlerime uyan hisseleri hızlıca bulabileyim.

*(Kaynak: `docs/epics.md` §8, Epic 4 — Story 4.1; PRD FR-030.)*

## Bağlam

Şimdiye kadar kurulan her endpoint (overview, fundamentals, candles, signals, score) **tek bir sembol** üzerinde çalışıyordu. Bir tarama özelliği doğası gereği **birden fazla hisseyi aynı anda** kriterlere göre filtreleyip listeler — bu, projenin ilk kez çok-sembollü bir işlem yapması anlamına gelir ve gerçek bir ölçek/performans sorusu doğurur.

**BIST:** Hâlâ canlı fiyat/temel veri kaynağı yok (Story 1.4'ten beri tutarlı mimari karar). Tarama, BIST için her zaman boş sonuç + uyarı döner — yeni bir karar değil, mevcut desenin devamı.

**ABD — evren kararı:** Finnhub'ın "tüm ABD piyasasını tara" diye bir endpoint'i yok; ücretsiz katman rate-limit'i (~60 istek/dk) gerçek zamanlı, sınırsız bir evrenin taranmasını imkânsız kılıyor. Kullanıcıyla netleştirildi: BIST'in statik sembol listesiyle aynı desende, **~120 tanınmış ABD hissesinden oluşan statik, seçilmiş bir evren** (`app/data/us_universe.json`) üzerinde tarama yapılır — gerçek piyasanın tamamı değil, ama S&P 100 benzeri, çeşitli sektörlere yayılmış, gerçek Finnhub verisiyle çalışan kullanılabilir bir MVP.

**Rate-limit'i aşmamak için iki önlem:**
1. **İki aşamalı filtreleme:** Önce yalnızca temel veri (`get_us_fundamentals`, sembol başına 1 istek) ile ucuz bir ön filtre uygulanır. RSI/hacim kriteri varsa, yalnızca bu ön filtreyi geçen (genelde evrenin küçük bir alt kümesi) sembol için mum verisi çekilip teknik filtre uygulanır.
2. **İşlem-içi (in-memory) önbellek, 30dk TTL + eşzamanlılık sınırı (`asyncio.Semaphore`):** Yeni bir DB/Celery değil — yalnızca çalışan FastAPI sürecinin belleğinde bir sözlük. Finnhub çağrıları küçük gruplar hâlinde paralel yapılır (tüm evren tek seferde değil).

## Kapsam

- **Backend:** `app/data/us_universe.json` (~120 sembol+ad+sektör); yeni `app/screener.py` (kriter modeli, iki aşamalı filtreleme, TTL'li önbellek); `GET /screener/run`.
- **Web/Mobil:** Yeni tarama ekranı — kriter formu + sonuç tablosu.

**Kapsam dışı:**
- Story 4.2 (kayıtlı taramalar) ve 4.3 (karşılaştırma) — ayrı story'ler.
- ~120'lik statik ABD evreninin ötesinde tam piyasa taraması.
- Taramanın DB'de önbelleklenmesi — yalnızca işlem-içi TTL önbelleği.

## Görevler

1. **[Backend]** `app/data/us_universe.json` — ~120 sembol, sektörlere yayılmış.
2. **[Backend]** `app/screener.py`: `ScreenerCriteria`, `ScreenerResult`, TTL'li önbellek (`_get_cached_fundamentals`), `run_screener()` (iki aşamalı filtre, semaphore ile sınırlı paralellik, BIST boş+uyarı).
3. **[Backend]** `GET /screener/run` endpoint'i.
4. **[Backend]** Testler: evren filtreleme (her kriter için), önbellek isabet/TTL süresi dolma, eşzamanlılık sınırı, BIST, endpoint testleri.
5. **[Web]** `/screener` sayfası + kriter formu + sonuç tablosu; `/dashboard`'a bağlantı.
6. **[Mobil]** `ScreenerScreen.tsx`; `HomeScreen`'e üçüncü bir görünüm olarak eklenir.

## Kabul Kriterleri

**AC1 — Çoklu kriterle tarama**
- **Given** tarama ekranı, **When** kullanıcı birden fazla temel+teknik kriteri birlikte ayarlarsa, **Then** tüm kriterlere uyan hisseler bir tabloda listelenir (FR-030).

**AC2 — Sonuç bulunamama**
- **Given** hiçbir hisse kriterlere uymuyorsa, **When** tarama çalıştırılırsa, **Then** "sonuç bulunamadı" durumu gösterilir.

**AC3 — Borsa kapsamı**
- **And** tarama sonuçları hem ABD hem BIST hisselerini borsa filtresine göre kapsar (BIST her zaman boş sonuç + net bir uyarı döner, veri kaynağı henüz yok).

## Definition of Done

- [x] AC1–AC3 karşılanıyor ve doğrulandı (backend: pytest yeşil [117/117] + ruff temiz; web: typecheck/lint/build yeşil; mobil: typecheck/lint + Metro bundle yeşil).
  - [ ] Canlı Finnhub smoke test — bu ortamda `FINNHUB_API_KEY` tanımlı değil, kullanıcı kendi anahtarıyla doğrulamalı.
- [x] `FINNHUB_API_KEY` olmadan da uygulama çökmüyor (`_run_us_screener` erken döner, uyarı verir; testlerle doğrulandı).
- [x] Yeni ortam değişkeni gerekmedi; yeni DB/Celery altyapısı kurulmadı (yalnızca işlem-içi önbellek).

## Teknik Notlar

- Önbellek TTL'i 30 dakika — temel veriler (F/K, ROE vb.) zaten günlük/çeyreklik güncellendiğinden bu doğruluğu bozmaz, yalnızca tekrarlanan taramaların Finnhub yükünü azaltır.
- Süreç yeniden başladığında önbellek sıfırlanır (Railway tek-süreç dağıtımı) — MVP için kabul edilebilir.
