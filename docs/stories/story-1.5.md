---
title: "Story 1.5: Hisse Genel Bakış Kartı"
epic: "Epic 1 — Kimlik Doğrulama, Hisse Keşfi ve Temel Altyapı"
story_id: "1.5"
status: done
created: 2026-09-15
updated: 2026-09-15
author: Bob (BMAD Scrum Master)
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md"]
depends_on: ["1.1", "1.2", "1.4"]
---

# Story 1.5: Hisse Genel Bakış Kartı

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want bir hisseyi açtığımda güncel fiyat, günlük değişim, piyasa değeri ve şirket bilgilerini görmek,
So that hisse hakkında hızlı bir ilk izlenim edinebileyim.

*(Kaynak: `docs/epics.md` §5, Epic 1 — Story 1.5; PRD FR-002.)*

**Not:** Story 1.3 (Dil Seçimi ve Yerelleştirme) kullanıcı kararıyla bir kez daha ertelendi; backlog'da açık kalmaya devam ediyor.

## Bağlam

Story 1.4, arama sonucuna tıklamayı bilinçli olarak kapsam dışı bırakmıştı çünkü gidilecek bir hisse detay sayfası yoktu. Bu story o sayfayı hayata geçirir ve arama sonuçlarını ona bağlar.

**ABD hisseleri:** Finnhub `/quote` (anlık fiyat/değişim) ve `/stock/profile2` (piyasa değeri, sektör, şirket adı) endpoint'leri birleştirilerek gösterilir.

**BIST hisseleri:** `architecture.md` §11 (Ertelenen Kararlar) uyarınca gerçek zamanlı/lisanslı BIST fiyat sağlayıcısı kararı (Foreks/Matriks/Algolab) henüz verilmedi. Bu story o kararı beklemez: BIST sembolleri için sayfa, statik dizinden bilinen sembol/şirket adını gösterir, fiyat/değişim/piyasa değeri alanları için ise sessizce boş bırakmak yerine NFR-2 gereği net bir "veri şu an güncellenemiyor" uyarısı gösterir. Gerçek zamanlı BIST sağlayıcısı entegre edildiğinde yalnızca `get_bist_overview` adaptörü değişecek, çağıran kod (endpoint, web/mobil arayüz) aynı kalacaktır (AD-5).

## Kapsam

- **Backend:** `GET /symbols/overview?symbol=&exchange=` — ABD için Finnhub'dan canlı genel bakış verisi, BIST için statik dizinden ad + "veri şu an güncellenemiyor" uyarısı döner.
- **Web:** `/stock/[exchange]/[symbol]` sayfası; `/dashboard` arama sonuçları bu sayfaya bağlanır.
- **Mobil:** Arama sonucuna dokunma, aynı ekranda (ayrı bir gezinme kütüphanesi eklemeden) genel bakış görünümüne geçer.

**Kapsam dışı:**
- BIST için gerçek zamanlı/lisanslı fiyat verisi entegrasyonu — ayrı, iş kararı gerektiren bir story (bkz. `architecture.md` Ertelenen Kararlar, Story 1.4 Bağlam bölümü).
- Temel analiz metrikleri (F/K, PD/DD, ROE vb.) — Epic 2 kapsamı.
- Teknik grafik/indikatörler — Epic 3 kapsamı.
- Özet değerlendirme skoru (FR-003) — Story 3.6 kapsamı.

## Görevler

1. **[Backend]** `app/market_data.py`: `StockOverview` modeli, `MarketDataUnavailableError`, `get_us_overview()` (Finnhub `/quote` + `/stock/profile2`, `asyncio.gather`), `get_bist_overview()` (statik dizinden ad çözümleme, finansal alanlar `None`).
2. **[Backend]** `GET /symbols/overview` endpoint'i: `exchange` değerine göre uygun fonksiyonu çağırır; BIST için her zaman, ABD için yalnızca hata durumunda `warnings` doldurur.
3. **[Backend]** Birim testleri: ABD başarı/hata senaryoları (mock'lanmış HTTP), BIST ad çözümleme + uyarı, endpoint entegrasyon testleri, geçersiz `exchange` değeri için 400.
4. **[Web]** `/stock/[exchange]/[symbol]` server component sayfası: fiyat/değişim/piyasa değeri/sektör/endüstri gösterimi, eksik alan için "Veri yok", sağlayıcı hatasında "veri şu an güncellenemiyor" uyarısı, sabit "yatırım tavsiyesi değildir" ibaresi.
5. **[Web]** `SearchBox` sonuçları `/stock/{exchange}/{symbol}`'a link olur.
6. **[Mobil]** `StockOverviewScreen` bileşeni; `HomeScreen` seçili sembolü state olarak tutup arama/genel bakış görünümleri arasında geçiş yapar (yeni bir gezinme kütüphanesi eklenmez).
7. **[Mobil]** `SearchBox` sonuçlarına dokunma, seçimi `HomeScreen`'e bildirir.

## Kabul Kriterleri

**AC1 — Genel bakış alanları gösterilir**
- **Given** bir hisse detay sayfası (ABD sembolü), **When** sayfa yüklenirse, **Then** güncel fiyat, günlük değişim (% ve mutlak), piyasa değeri, sektör ve şirket adı gösterilir (FR-002).
- **Given** aynı sayfa (BIST sembolü), **When** sayfa yüklenirse, **Then** şirket adı statik dizinden gösterilir; fiyat/değişim/piyasa değeri alanları için AC2'deki uyarı gösterilir.

**AC2 — Sağlayıcı erişilemezliği sessiz geçilmez**
- **Given** piyasa veri sağlayıcısı geçici olarak erişilemez (Finnhub anahtarı yok/istek başarısız, veya BIST için henüz entegre edilmemiş), **When** veri çekilemezse, **Then** sessiz bir boşluk yerine "veri şu an güncellenemiyor" uyarısı gösterilir (NFR-2).

**AC3 — Yasal ibare**
- **And** sayfanın her yerinde "yatırım tavsiyesi değildir" ibaresi sabit olarak yer alır (NFR-3, NFR-7).

**AC4 — Arama sonucundan gidiş**
- **Given** arama sonuç listesi, **When** kullanıcı bir sonuca tıklarsa/dokunursa, **Then** ilgili hissenin genel bakış görünümüne yönlendirilir (web: `/stock/[exchange]/[symbol]` sayfası; mobil: aynı ekranda genel bakış görünümü).

## Definition of Done

- [x] AC1–AC4 karşılanıyor ve doğrulandı (backend: pytest yeşil + canlı `uvicorn` smoke test; web: typecheck/lint/build; mobil: typecheck/lint).
- [x] `FINNHUB_API_KEY` olmadan da uygulama çökmüyor — yalnızca uyarı döner.
- [x] Yeni ortam değişkeni gerekmedi (mevcut `FINNHUB_API_KEY` yeniden kullanıldı).

## Teknik Notlar

- Finnhub `/quote`: `{"c": current, "d": change, "dp": percent change, "h", "l", "o", "pc": previous close, "t"}`.
- Finnhub `/stock/profile2`: `{"name", "marketCapitalization" (milyon cinsinden, para birimiyle), "currency", "finnhubIndustry", ...}` — Finnhub ayrı bir "endüstri" alanı sunmadığından `finnhubIndustry` "sektör" olarak eşlenir, "endüstri" alanı bu MVP'de "veri yok" kalır.
- Finnhub geçersiz sembol için hata değil, tüm alanları `0` olan bir `/quote` yanıtı döner; bu nedenle `c == 0 and pc == 0` durumu `MarketDataUnavailableError` olarak ele alınır.
