---
title: "Story 2.2: Sektör Kıyaslaması"
epic: "Epic 2 — Temel Analiz (Fundamental)"
story_id: "2.2"
status: done
created: 2026-09-15
updated: 2026-09-15
author: Bob (BMAD Scrum Master)
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md"]
depends_on: ["2.1"]
---

# Story 2.2: Sektör Kıyaslaması

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want her metriğin sektör/endeks ortalamasıyla karşılaştırmasını görmek,
So that hissenin sektörüne göre ucuz mu pahalı mı olduğunu anlayabileyim.

*(Kaynak: `docs/epics.md` §6, Epic 2 — Story 2.2; PRD FR-011.)*

## Bağlam

Story 2.1, "Temel Analiz" sekmesinde tek bir hissenin ham metrik değerlerini gösterdi. Bu story, aynı sekmedeki her metriğin **yanına** bir sektör ortalaması ve bu ortalamaya göre konum (% fark) ekler — FR-011: *"Sektör ortalaması F/K: 18.2, bu hisse: 14.5"* örneğindeki gibi.

**Veri kaynağı kararı:** Finnhub'ın hazır bir "sektör ortalaması" endpoint'i yok. Ancak ücretsiz katmanda `GET /stock/peers?symbol=&grouping=sector` ile aynı sektördeki emsal (peer) sembollerin listesi alınabiliyor. Bu story, önceden kurulmuş bir `fundamentals_snapshot` tablosu/Celery günsonu işi (bkz. Story 2.1 Bağlam — bilinçli olarak bu projede henüz yok) **beklemeden**, sektör ortalamasını **istek anında emsal şirketlerin temel metriklerinin ortalamasını alarak** hesaplar:

1. `GET /stock/peers?symbol=X&grouping=sector` → emsal sembol listesi (sorgulanan sembolün kendisi listeden çıkarılır, listelenen ilk 8 emsalle sınırlanır — Finnhub ücretsiz katmanın dakika başı istek limitini zorlamamak için).
2. Her emsal için Story 2.1'de zaten var olan `get_us_fundamentals()` paralel (`asyncio.gather(..., return_exceptions=True)`) çağrılır; başarısız olan tekil emsaller sonucu bozmaz, sadece ortalamadan düşer.
3. Her metrik için, değeri olan emsallerin aritmetik ortalaması alınır (bir metrikte hiçbir emsalin verisi yoksa o metriğin sektör ortalaması `null` kalır — AC2/AC3'ün "veri yok" davranışıyla birebir aynı desen).
4. Hissenin kendi değeri ile ortalama arasındaki `%` fark hesaplanır (`(değer - ortalama) / |ortalama| * 100`).

**BIST:** Emsal/sektör verisi kaynağı BIST için de tanımlı değil (Story 1.4/1.5/2.1 ile tutarlı, tekrar eden bir mimari karar): sektör kıyaslaması hesaplanmaz, her metrik satırında "sektör verisi yok" gösterilir.

**Neden ayrı bir DB/Celery önbelleği kurulmuyor:** Story 2.1'deki gerekçe aynen geçerli — bu proje henüz hiç Postgres migration/Celery altyapısı kurmadı; emsal bazlı istek-anı hesaplama, ek bir mimari bileşen icat etmeden FR-011'i MVP'de doğru şekilde karşılar. Gerçek kullanım verisi rate-limit/performans sorunu ortaya çıkarırsa, o zaman önbellekleme ayrı bir story olarak ele alınmalı.

## Kapsam

- **Backend:** `app/fundamentals.py`'ye `SectorComparison`/`MetricComparison` modelleri ve `get_us_sector_comparison()`; mevcut `GET /fundamentals` yanıtına `sector_comparison` alanı eklenir (yeni bir endpoint değil — aynı sekme, aynı istek).
- **Web/Mobil:** "Temel Analiz" sekmesindeki her metrik satırına sektör ortalaması + % fark eklenir; kıyaslama yoksa "Sektör verisi yok".

**Kapsam dışı:**
- Emsal/sektör ortalamalarının önbelleklenmesi veya zamanlanmış güncellenmesi (yukarıda gerekçelendirildi).
- Geçmiş finansal performans grafiği (FR-013) — Story 2.3.
- Endeks (S&P 500 vb.) bazlı kıyaslama — yalnızca sektör/emsal bazlı kıyaslama yapılıyor (FR-011'in "sektör/endeks" ifadesindeki iki seçenekten daha ucuz/uygulanabilir olanı; endeks bazlı kıyaslama için ayrı bir endeks bileşimi veri kaynağı gerekir).

## Mimari Yaklaşım

- Yeni bir modül/endpoint yerine mevcut `fundamentals` modülü ve `GET /fundamentals` endpoint'i genişletilir — sektör kıyaslaması kavramsal olarak aynı bounded context'e ait (AD-1).
- `get_us_sector_comparison()`, Story 2.1'in `get_us_fundamentals()` fonksiyonunu emsaller için yeniden kullanır (DRY); Finnhub'a özgü hiçbir alan adı bu fonksiyonun dışına sızmaz (AD-5).
- Emsal sayısı sabit bir üst sınırla (8) sınırlanır ve tekil emsal hataları `return_exceptions=True` ile izole edilir — bu, Finnhub ücretsiz katman rate-limit'ine karşı kasıtlı bir dayanıklılık kararıdır, üzerine inşa edilen bir "kapsam fazlalığı" değildir.

## Görevler

1. **[Backend]** `app/fundamentals.py`: `MetricComparison` (`value`, `sector_average`, `diff_pct`) ve `SectorComparison` (12 metrik alanı, her biri `MetricComparison | None`) modelleri.
2. **[Backend]** `get_peer_symbols()`: Finnhub `/stock/peers`, sorgulanan sembolü listeden çıkarır, ilk 8 ile sınırlar.
3. **[Backend]** `get_us_sector_comparison(symbol, own_snapshot)`: emsalleri paralel çeker, metrik bazlı ortalama + `%` fark hesaplar; emsal listesi boşsa/tamamı başarısızsa `None` döner.
4. **[Backend]** `GET /fundamentals` yanıtına `sector_comparison` alanı eklenir (US başarılıysa hesaplanır, BIST/hata durumunda `None`).
5. **[Backend]** Birim testleri: ortalama hesaplama (kısmi emsal verisiyle), emsal listesi boş/hatalı senaryosu, endpoint entegrasyon testi.
6. **[Web]** `fundamentals-panel.tsx`: her metrik satırına sektör ortalaması + işaretli `%` fark (yeni `formatSignedPercent` yardımcı fonksiyonu, `packages/shared`); kıyaslama yoksa "Sektör verisi yok".
7. **[Mobil]** `FundamentalsPanel.tsx`: aynı davranış.

## Kabul Kriterleri

**AC1 — Her metriğin yanında sektör ortalaması ve konum gösterilir**
- **Given** temel metrik listesi (Temel Analiz sekmesi), **When** her metrik gösterilirse, **Then** yanında sektör ortalaması ve hissenin bu ortalamaya göre konumu (üstünde/altında, `%` fark) gösterilir (FR-011).

**AC2 — Sektör verisi eksikse net şekilde işaretlenir**
- **Given** hissenin sektör/emsal bilgisi eksikse (BIST sembolü, veya ABD sembolü için emsal listesi boş/tamamen alınamıyor), **When** kıyaslama hesaplanamazsa, **Then** kıyaslama alanı "sektör verisi yok" olarak gösterilir; sayfa çökmez, diğer alanlar (Story 2.1'deki ham değerler) etkilenmez.

**AC3 — Kısmi emsal verisi kıyaslamayı bozmaz**
- **Given** emsallerin bir kısmı için Finnhub verisi alınamıyorsa, **When** sektör ortalaması hesaplanırsa, **Then** yalnızca verisi olan emsaller ortalamaya dahil edilir; bir metrikte hiçbir emsalin verisi yoksa yalnızca o metrik için "sektör verisi yok" gösterilir, diğer metrikler etkilenmez.

## Definition of Done

- [x] AC1–AC3 karşılanıyor ve doğrulandı (backend: pytest 46/46 yeşil + canlı `uvicorn` smoke test; web: typecheck/lint/build; mobil: typecheck/lint + Metro bundle (iOS)).
- [x] `FINNHUB_API_KEY` olmadan da uygulama çökmüyor.
- [x] Yeni ortam değişkeni gerekmedi (mevcut `FINNHUB_API_KEY` yeniden kullanıldı).

## Teknik Notlar

- Finnhub `/stock/peers?symbol={symbol}&grouping=sector&token={key}` → sembol string'lerinden oluşan düz bir JSON dizisi döner; sorgulanan sembolün kendisini de içerebildiği doğrulandı, bu nedenle sonuç listesinden büyük/küçük harf duyarsız şekilde çıkarılır.
- `%` fark: `(hissenin_değeri - sektör_ortalaması) / |sektör_ortalaması| * 100`; sektör ortalaması `0` ise (bölme hatası riski) fark `None` kalır.
- Bu story'nin en pahalı işlemi budur: tek bir "Temel Analiz" sekmesi açılışı, en fazla 1 (kendi metrikleri) + 1 (emsal listesi) + 8 (emsal metrikleri) = 10 Finnhub isteği tetikleyebilir. Bu, sekme her açıldığında yeniden hesaplanır (önbellek yok) — kullanım arttıkça bu story'nin kapsam dışı bıraktığı önbellekleme kararının yeniden gözden geçirilmesi gerekebilir.
