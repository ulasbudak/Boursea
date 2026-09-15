---
title: "Story 2.1: Temel Metriklerin Gösterimi"
epic: "Epic 2 — Temel Analiz (Fundamental)"
story_id: "2.1"
status: done
created: 2026-09-15
updated: 2026-09-15
author: Bob (BMAD Scrum Master)
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md"]
depends_on: ["1.1", "1.2", "1.5"]
---

# Story 2.1: Temel Metriklerin Gösterimi

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want bir hissenin F/K, PD/DD, ROE, ROA, EPS, temettü verimi, borç/özsermaye, kâr marjı gibi temel metriklerini görmek,
So that hissenin finansal sağlığını değerlendirebileyim.

*(Kaynak: `docs/epics.md` §6, Epic 2 — Story 2.1; PRD FR-010.)*

## Bağlam

Epic 1 ile hisse detay sayfası (Story 1.5) tek bir "Genel Bakış" görünümü olarak kuruldu. Bu story, o sayfaya ikinci bir sekme ekleyerek Epic 2'yi (Temel Analiz) başlatır ve `architecture.md` §5'te tanımlanan **`fundamentals`** modülünü ilk kez hayata geçirir.

**Veri kaynağı:** ABD sembolleri için Finnhub'ın `/stock/metric?metric=all` (Company Basic Financials) endpoint'i kullanılır — bu endpoint 100'den fazla oran içeren geniş bir sözlük döner ve alan adları sembole/plana göre değişebilir (bazı semboller yalnızca yıllık, bazıları TTM değeri sağlar). Bu nedenle her metrik için **öncelik sıralı birden fazla aday alan adı** denenir; hiçbiri yoksa metrik "veri yok" olur — bu, AC2'nin ("veri yoksa çökme, işaretle") tam olarak gerektirdiği davranıştır, savunmacı programlama burada kapsam fazlalığı değil AC'nin kendisidir.

**BIST:** Story 1.4/1.5'teki ile aynı, tutarlı MVP kararı geçerlidir — gerçek zamanlı/lisanslı bir BIST temel veri sağlayıcısı kararı henüz verilmedi (`architecture.md` §11, Ertelenen Kararlar). Bu story o kararı beklemez: BIST sembolleri için tüm metrikler "veri yok" döner ve sayfada net bir "veri şu an güncellenemiyor" uyarısı gösterilir (NFR-2), sessiz bir boşluk bırakılmaz.

**Kalıcı depolama yok (bilinçli MVP kapsamı):** `architecture.md` §7'de seed olarak listelenen `fundamentals_snapshot` tablosu ve AD-8'deki Celery günsonu güncelleme işi bu story'nin kapsamında **değildir**. Backend + Celery + Redis + migration altyapısı bu projede henüz hiç kurulmadı (yalnızca bir Supabase bağlantı health-check'i var); bunu tek bir story içinde icat etmek orantısız olur. Bunun yerine Story 1.4/1.5 ile aynı desen izlenir: **istek anında Finnhub'dan çekilen, önbelleksiz** bir yanıt. Gerçek bir önbellekleme/zamanlanmış-güncelleme ihtiyacı ortaya çıktığında (performans veya Finnhub rate-limit sorunu somut olarak gözlemlendiğinde) ayrı bir story ile ele alınmalı.

## Kapsam

- **Backend:** Yeni `app/fundamentals.py` modülü; `GET /fundamentals?symbol=&exchange=` — ABD için Finnhub `/stock/metric`'ten normalize edilmiş bir `FundamentalsSnapshot`, BIST için tüm alanları `None` + uyarı.
- **Web:** Hisse detay sayfasına ("`/stock/[exchange]/[symbol]`") "Genel Bakış" / "Temel Analiz" sekmeleri; Temel Analiz sekmesi açıldığında `/fundamentals` çağrılır.
- **Mobil:** `StockOverviewScreen`'e aynı iki sekme; aynı davranış.

**Kapsam dışı:**
- Sektör/endeks ortalamasına göre kıyaslama (FR-011) — Story 2.2.
- Geçmiş finansal performans grafiği (FR-013) — Story 2.3.
- `fundamentals_snapshot` DB tablosu, Celery ile zamanlanmış güncelleme, önbellekleme — yukarıda gerekçelendirildiği gibi ayrı bir story.

## Mimari Yaklaşım

- Yeni bounded-context modülü: `app/fundamentals.py` (mevcut `app/market_data.py` deseniyle birebir aynı yapı: Pydantic modeli + saf fonksiyonlar + FastAPI route'u `main.py`'de ince bir katman). Bu, AD-1 (modüler monolit, net iç sınırlar) ve AD-5 (sağlayıcıya özgü format normalizasyonu tek adaptörde izole edilir) ile uyumludur.
- `FundamentalsSnapshot` normalize edilmiş veri modeli, Finnhub'ın ham alan adlarını dışa sızdırmaz — ileride BIST için gerçek bir sağlayıcı eklendiğinde veya Finnhub alan adları değiştiğinde yalnızca `get_us_fundamentals()` içindeki eşleme değişir, endpoint/istemci sözleşmesi sabit kalır.
- Her normalize alan için aday Finnhub anahtarlarının öncelik sıralı bir listesi tutulur (`_first_present(metric_dict, *candidate_keys)` yardımcı fonksiyonu); ilk mevcut ve `None` olmayan değer kullanılır.

## Görevler

1. **[Backend]** `app/fundamentals.py`: `FundamentalsSnapshot` modeli, `FundamentalsUnavailableError`, `get_bist_fundamentals()` (tüm alanlar `None`), `get_us_fundamentals()` (Finnhub `/stock/metric`, aday-anahtar eşleme).
2. **[Backend]** `GET /fundamentals` endpoint'i: `exchange`'e göre yönlendirir, BIST için her zaman, ABD için yalnızca hata durumunda `warnings` doldurur; geçersiz `exchange` için 400.
3. **[Backend]** Birim testleri: aday-anahtar eşleme (birincil/ikincil/hiçbiri mevcut değil senaryoları), Finnhub başarı/hata senaryoları (mock'lanmış HTTP), BIST sabit uyarı, endpoint entegrasyon testleri.
4. **[Web]** Hisse detay sayfasını `StockTabs` (client) ile sekmeli hale getir: "Genel Bakış" (mevcut, sunucu tarafında önceden getirilmiş) ve "Temel Analiz" (`FundamentalsPanel`, client, sekme açıldığında `/fundamentals` çağırır).
5. **[Web]** `FundamentalsPanel`: 11 metriği listeler, her biri için değer yoksa "Veri yok", sağlayıcı hatasında "veri şu an güncellenemiyor".
6. **[Mobil]** `StockOverviewScreen`'e aynı iki sekmeli davranış (yerel state ile, yeni bir gezinme kütüphanesi eklenmeden — mevcut ekran geçişi deseniyle tutarlı).

## Kabul Kriterleri

**AC1 — Tüm FR-010 metrikleri gösterilir**
- **Given** hisse detay sayfasının "Temel Analiz" sekmesi, **When** kullanıcı sekmeyi açarsa, **Then** PRD FR-010'da listelenen tüm metrikler (F/K, PD/DD, ROE, ROA, EPS, EPS büyüme oranı, temettü verimi, borç/özsermaye, brüt kâr marjı, net kâr marjı, FAVÖK marjı, serbest nakit akışı, piyasa değeri) güncel değerleriyle gösterilir.

**AC2 — Eksik veri sayfayı çökertmez**
- **Given** bir metrik için veri mevcut değilse (Finnhub o sembol için o alanı döndürmüyorsa), **When** sayfa render edilirse, **Then** yalnızca o metrik "veri yok" olarak işaretlenir, sayfanın geri kalanı ve diğer metrikler normal gösterilir, sayfa çökmez.

**AC3 — Sağlayıcı erişilemezliği / BIST kapsam dışı sessiz geçilmez**
- **Given** Finnhub isteği başarısız olursa veya sembol BIST'te ise (henüz veri sağlayıcısı yok), **When** Temel Analiz sekmesi açılırsa, **Then** tüm metrikler "veri yok" gösterilir **ve** ayrıca net bir "veri şu an güncellenemiyor" uyarısı gösterilir (NFR-2) — bu, AC2'deki tekil-metrik "veri yok" durumundan görsel olarak ayrıştırılır.

**AC4 — Normalize veri modeli**
- **And** metrik değerleri, backend `fundamentals` modülünden gelen normalize edilmiş bir veri modeline (`FundamentalsSnapshot`) göre gösterilir; web ve mobil aynı alan adlarını tüketir (mimari AD-5 ile uyumlu).

## Definition of Done

- [x] AC1–AC4 karşılanıyor ve doğrulandı (backend: pytest 39/39 yeşil + canlı `uvicorn` smoke test; web: typecheck/lint/build; mobil: typecheck/lint + Metro bundle (iOS)).
- [x] `FINNHUB_API_KEY` olmadan da uygulama çökmüyor — yalnızca "veri şu an güncellenemiyor" uyarısı döner (canlı doğrulandı).
- [x] Yeni ortam değişkeni gerekmedi (mevcut `FINNHUB_API_KEY` yeniden kullanıldı).

## Teknik Notlar

- Finnhub `/stock/metric?symbol={symbol}&metric=all` → `{"metric": {...100+ alan...}, "metricType": "all", "series": {...}, "symbol": "..."}`. `metric` sözlüğündeki alan adları TTM/Annual/Quarterly varyantlarına göre değişir; bilinen aday adlar (öncelik sırasıyla) kod içinde belgelenmiştir (bkz. `get_us_fundamentals` docstring/yorumları).
- `marketCapitalization` alanı bu endpoint'te de mevcuttur (Story 1.5'teki `/stock/profile2`'den bağımsız, `fundamentals` modülü kendi verisini kendi adaptör çağrısıyla alır — AD-1 modül sınırlarıyla tutarlı, hafif veri tekrarı MVP için kabul edilebilir).
- Bir sonraki story (2.2) bu snapshot'a sektör ortalaması karşılaştırması ekleyecek; `FundamentalsSnapshot` modeli o zaman genişletilecek.
