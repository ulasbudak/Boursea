---
title: "Story 2.3: Geçmiş Finansal Performans Grafiği"
epic: "Epic 2 — Temel Analiz (Fundamental)"
story_id: "2.3"
status: done
created: 2026-09-15
updated: 2026-09-15
author: Bob (BMAD Scrum Master)
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md"]
depends_on: ["2.1"]
---

# Story 2.3: Geçmiş Finansal Performans Grafiği

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want şirketin son 5 yıl/20 çeyreklik gelir, net kâr ve EPS grafiğini görmek,
So that şirketin zaman içindeki finansal trendini değerlendirebileyim.

*(Kaynak: `docs/epics.md` §6, Epic 2 — Story 2.3; PRD FR-013.)*

Bu, Epic 2'nin (Temel Analiz) son story'sidir.

## Bağlam

**Veri kaynağı ve bilinçli bir birim kararı:** Finnhub'ın ücretsiz katmanında SEC'e bildirilen ham finansal tablolar ("Financials As Reported") **yok** — yalnızca `/stock/metric?metric=all` yanıtının `series.annual` / `series.quarterly` bölümü geçmişe dönük veri sağlıyor, ve bu bölüm yalnızca **hisse başına** ve marj bazlı alanlar içeriyor (örn. `salesPerShare`, `netMargin`, `eps`) — mutlak (toplam dolar) gelir/net kâr alanı yok. Mutlak tutarları yaklaşık olarak üretmek (bugünkü hisse adedini geçmiş dönemlere uygulayarak) geri alım/ihraç nedeniyle eski dönemler için yanıltıcı olabilir, bu da NFR-3 (Veri Doğruluğu) ile çelişir. Bu nedenle bu story bilinçli olarak **hisse başına** değerleri gösterir: "Hisse Başına Gelir", "Hisse Başına Net Kâr" (= `salesPerShare × netMargin`) ve `EPS`. Trend eğrisinin şekli (büyüme/düşüş) mutlak tutarla hisse başına tutar arasında hisse sayısı yıllar içinde büyük ölçüde değişmediği sürece neredeyse aynıdır — story'nin asıl amacı olan "zaman içindeki finansal trendi değerlendirme" bu şekilde dürüstçe karşılanır.

**Grafik motoru:** `architecture.md` AD-9, TradingView Lightweight Charts'ı tüm uygulama için **tek** grafik motoru olarak belirler — ama bu karar, Epic 3/Story 3.1'in kapsamı olan interaktif mum/fiyat grafiği ve onun mobil WebView köprüsü içindir. Bu story için o altyapıyı (henüz kurulmamış) inşa etmek orantısız bir kapsam genişlemesi olur. Bunun yerine, 5-20 barlık basit bir trend grafiği için **hiçbir yeni bağımlılık eklemeden** düz `View`/`div` tabanlı bar grafiği kullanılır (web: yükseklik oranlı `div`'ler; mobil: yükseklik oranlı `View`'lar). Story 3.1 geldiğinde asıl mum grafiği AD-9'a göre kurulacaktır; bu story onun yerine geçmez.

**BIST:** Aynı tutarlı MVP kararı — geçmiş finansal veri kaynağı BIST için tanımlı değil; boş seri + "veri şu an güncellenemiyor" uyarısı döner.

**Neden ayrı bir endpoint (aynı Finnhub isteğini yeniden kullanmak yerine):** Story 2.1/2.2'nin test edilmiş `get_us_fundamentals`/`get_us_sector_comparison` kodunu bu story için riske atmamak amacıyla, geçmiş performans kendi bağımsız Finnhub isteğini yapan ayrı bir `GET /fundamentals/history` endpoint'i olarak eklenir. Bu, kullanıcı hem "Temel Analiz" metriklerini hem "Geçmiş Performans" grafiğini aynı anda görüntülediğinde Finnhub'a 1 fazladan istek anlamına gelir (aynı `/stock/metric` yanıtının `metric` ve `series` alanları ayrı ayrı çekilir) — bilinçli bir MVP basitliği/güvenlik tercihi; gerçek kullanım rate-limit sorunu çıkarırsa tek bir payload'ı paylaşacak şekilde birleştirilebilir.

## Kapsam

- **Backend:** `app/fundamentals.py`'ye `HistoricalDataPoint`/`HistoricalPerformance` modelleri ve `get_us_historical_performance()`/`get_bist_historical_performance()`; yeni `GET /fundamentals/history?symbol=&exchange=` endpoint'i.
- **Web/Mobil:** "Temel Analiz" sekmesine, metrik listesinin altında bir "Geçmiş Performans" bölümü; yıllık/çeyreklik geçiş; üç mini bar grafiği (Hisse Başına Gelir, Hisse Başına Net Kâr, EPS).

**Kapsam dışı:**
- Mutlak (toplam dolar) gelir/net kâr rakamları — yukarıda gerekçelendirildi.
- TradingView Lightweight Charts / AD-9 altyapısının kurulması — Story 3.1 kapsamı.
- Geçmiş verinin önbelleklenmesi — Story 2.1/2.2 ile tutarlı, istek-anı hesaplama.

## Görevler

1. **[Backend]** `app/fundamentals.py`: `HistoricalDataPoint` (`period`, `revenue_per_share`, `net_income_per_share`, `eps`), `HistoricalPerformance` (`symbol`, `exchange`, `annual: list`, `quarterly: list`).
2. **[Backend]** `_build_data_points()`: `series.annual`/`series.quarterly` sözlüğünden aday alan adlarıyla (`salesPerShare`/`revenuePerShare`, `netMargin`, `eps`) dönem bazlı değerleri çıkarır, en yeni N dönemle sınırlar (yıllık: 5, çeyreklik: 20), kronolojik sırayla döner.
3. **[Backend]** `get_us_historical_performance()`/`get_bist_historical_performance()`; `GET /fundamentals/history` endpoint'i.
4. **[Backend]** Birim testleri: seri çıkarma (eksik alan senaryoları dahil), limit uygulama, Finnhub hata senaryosu, BIST boş seri, endpoint entegrasyon testleri.
5. **[Web]** `historical-performance-chart.tsx`: yıllık/çeyreklik toggle + üç mini bar grafiği (yeni bağımlılık yok, düz `div` yükseklik oranı).
6. **[Mobil]** Aynı bileşen `View` tabanlı bar'larla.

## Kabul Kriterleri

**AC1 — 5 yıllık/20 çeyreklik grafik gösterimi**
- **Given** hisse detay sayfasının temel analiz sekmesi, **When** kullanıcı "Geçmiş Performans" bölümüne gelirse, **Then** son 5 yıl (yıllık) hisse başına gelir/net kâr/EPS grafik olarak gösterilir; kullanıcı çeyreklik görünüme geçtiğinde son 20 çeyrek gösterilir (FR-013).

**AC2 — Yıllık/çeyreklik geçiş**
- **And** kullanıcı yıllık/çeyreklik görünüm arasında anında geçiş yapabilir.

**AC3 — Eksik veri çökme değil, net durum gösterir**
- **Given** bir dönem için bir veya daha fazla metrik eksikse (Finnhub o dönemi döndürmüyorsa), **When** grafik render edilirse, **Then** yalnızca o dönem/metrik için veri gösterilmez (bar boş kalır), grafik çökmez; hiç veri yoksa (BIST veya Finnhub hatası) bölüm "veri şu an güncellenemiyor" gösterir.

## Definition of Done

- [x] AC1–AC3 karşılanıyor ve doğrulandı (backend: pytest 54/54 yeşil + canlı `uvicorn` smoke test; web: typecheck/lint/build; mobil: typecheck/lint + Metro bundle (iOS)).
- [x] `FINNHUB_API_KEY` olmadan da uygulama çökmüyor.
- [x] Yeni ortam değişkeni veya bağımlılık eklenmedi.

## Teknik Notlar

- Finnhub `/stock/metric` yanıtının `series.annual`/`series.quarterly` alanları, resmi Finnhub örnek yanıtında doğrulandığı üzere `{"<alanAdı>": [{"period": "YYYY-MM-DD", "v": <sayı>}, ...]}` şeklindedir (örn. `salesPerShare`, `netMargin`, `currentRatio`); `eps` alan adı da aynı desene uyduğu varsayılarak aday listeye eklendi, ancak canlı doğrulama yapılmadı (API anahtarı bu ortamda yok) — kod, alan bulunamazsa o metriği `null` bırakacak şekilde savunmacı yazıldı (Story 2.1/2.2 ile aynı desen).
- Hisse başına net kâr, `salesPerShare × netMargin` olarak türetilir; ikisinden biri o dönem için eksikse sonuç `null`'dur (yanlış/varsayılan bir değer üretilmez).
- Bu story, Finnhub'a `/fundamentals` çağrısına ek olarak bağımsız bir çağrı daha ekler (bkz. Bağlam) — Story 2.2 ile birlikte (emsal + geçmiş) bir "Temel Analiz" sekmesi açılışı en fazla ~11 Finnhub isteğine çıkabilir; gerçek kullanımda rate-limit sorunu gözlenirse birleştirme/önbellekleme değerlendirilmeli.
