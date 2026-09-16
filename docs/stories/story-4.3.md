---
title: "Story 4.3: Hisse Karşılaştırma Tablosu"
epic: "Epic 4 — Tarama (Screener) ve Karşılaştırma"
story_id: "4.3"
status: done
created: 2026-09-16
updated: 2026-09-16
author: Bob (BMAD Scrum Master) & Amelia (BMAD Developer)
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md §8"]
language: tr
translationOf: null
englishVersion: docs/stories/story-4.3.en.md
depends_on: ["2.1", "3.5", "3.7"]
---

# Story 4.3: Hisse Karşılaştırma Tablosu

*English version: [`docs/stories/story-4.3.en.md`](story-4.3.en.md).*

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want en az 4 hisseyi yan yana temel ve teknik metriklerle karşılaştırmak,
So that hangisinin daha iyi bir seçim olduğuna karar verebileyim.

*(Kaynak: `docs/epics.md` §8, Epic 4 — Story 4.3; PRD FR-032.)*

**Not — AC'deki 2-4 ile hikayedeki "en az 4" arasındaki fark:** Epic dokümanının kabul kriterleri ("2-4 arası hisse ekleyin") ile kullanıcı hikayesinin metni ("en az 4 hisse") arasında küçük bir tutarsızlık var. Uygulama, **kabul kriterlerini** (2-4 arası, üst sınır 4) esas aldı — bu hem epics.md'nin resmi AC'si hem de MVP'nin veri sağlayıcı rate-limit kısıtlarıyla (her karşılaştırma isteği, sembol başına fundamentals+candles için gerçek zamanlı Finnhub/TwelveData çağrısı yapıyor) daha uyumlu.

## Bağlam

Bu story, yeni bir veri kaynağı icat etmiyor — Story 2.x'in temel analiz (`app/fundamentals.py`), Story 3.x'in teknik göstergeler (`app/technical.py::_rsi`) ve Story 3.7'nin özet skor (`app/scoring.py::compute_score`) fonksiyonlarını **birden fazla sembol için paralel** çağırıp tek bir yanıt hâlinde birleştiren ince bir orkestrasyon katmanı ekliyor.

**Neden `compute_us_score(symbol)` değil de `compute_score(fundamentals, candles)` çağrılıyor:** `compute_us_score`, fundamentals ve candles verisini kendi içinde ayrıca çekiyor. Karşılaştırma ekranı zaten bu ikisini tabloda göstermek için ayrıca çekmek zorunda olduğundan, aynı veriyi iki kez (biri gösterim için, biri skor hesaplamak için) çekmemek adına ham `compute_score(fundamentals, candles)` fonksiyonu tercih edildi — sembol başına Finnhub/TwelveData çağrı sayısı 3'ten 2'ye indi (fundamentals + candles, ayrı bir "skor için fundamentals/candles" çağrısı yok).

**BIST:** Story 4.1/2.x'teki tutarlı mimari kararın devamı — BIST için canlı temel/teknik veri kaynağı yok, bu yüzden bir BIST sembolü karşılaştırmaya eklendiğinde yer tutucu bir `FundamentalsSnapshot` (tüm alanlar `None`) ve net bir uyarı döner; sembol yine de tabloda "—" değerleriyle görünür, çökme olmaz.

## Kapsam

**Bu PR'da tamamlanan:**
- **Backend:** `app/comparison.py` — `ComparisonEntry` modeli (`symbol, exchange, fundamentals, score, rsi, warnings`), `compare_symbols(entries)` (ABD sembolleri için paralel fundamentals+candles çekimi, BIST için yer tutucu); `GET /compare?symbols=AAPL:US,MSFT:US` uç noktası (2-4 sembol doğrulaması, `SYMBOL:EXCHANGE` format doğrulaması).
- **Web:** Yeni `/compare` sayfası — sembol arama+ekleme (mevcut arama kutusunun debounce deseniyle), seçili sembol çipleri (kaldırılabilir), karşılaştırma tablosu (F/K, Piyasa Değeri, ROE, Borç/Özsermaye, Net Kâr Marjı, RSI, Özet Skor satırları); her satırda göreli olarak en iyi/en kötü değer yeşil/kırmızı renkle vurgulanıyor (RSI hariç — RSI için mutlak sağlık eşiklerine göre renklendirme kullanılıyor, tarama ekranındaki `rsiTone` mantığıyla aynı).
- **Mobil:** Yeni `CompareScreen.tsx` — aynı akış (arama+ekleme, çip listesi, metrik satırları), `HomeScreen`'e yeni bir nav kartı olarak eklendi.
- **i18n:** Yeni `Messages.comparison` bölümü (tr/en).

**Kapsam dışı (bilinçli):**
- Karşılaştırmanın kaydedilmesi (Story 4.2'nin kayıtlı taramalarına benzer bir "kayıtlı karşılaştırma" özelliği) — istenmedi, AC'de yer almıyor.
- BIST hisseleri arasında gerçek karşılaştırma — BIST için hâlâ canlı veri kaynağı yok (tutarlı, tekrarlanan bir sınırlama).
- Grafik/görsel karşılaştırma (örn. üst üste bindirilmiş fiyat grafikleri) — AC yalnızca bir "tablo" istiyor.

## Görevler

1. **[Backend]** `app/comparison.py`: `ComparisonEntry` modeli, `_compare_us_symbol`, `_compare_bist_symbol`, `compare_symbols`. ✅
2. **[Backend]** `GET /compare` uç noktası: `SYMBOL:EXCHANGE` formatı ayrıştırma, 2-4 sembol sınırı doğrulaması. ✅
3. **[Backend]** Testler: ABD sembolü başarı/fundamentals hatası/candles hatası, BIST yer tutucu, karışık ABD+BIST, uç nokta (400/200) testleri. ✅
4. **[Web]** `/compare` sayfası + `compare-view.tsx` (arama, ekleme/çıkarma, tablo, göreli en iyi/kötü vurgusu); dashboard'a nav kartı. ✅
5. **[Mobil]** `CompareScreen.tsx`; `HomeScreen`'e nav kartı. ✅
6. **[Hepsi]** `Messages.comparison` (tr/en). ✅

## Kabul Kriterleri

**AC1 — Yan yana karşılaştırma**
- **Given** karşılaştırma ekranı, **When** kullanıcı 2-4 arası hisse eklerse, **Then** seçilen hisselerin temel ve teknik metrikleri yan yana bir tabloda gösterilir (FR-032).

**AC2 — Görsel vurgulama**
- **Given** karşılaştırma tablosu, **When** bir metrikte bir hisse diğerlerinden belirgin şekilde iyi/kötü ise, **Then** bu görsel olarak vurgulanır (F/K, ROE, Borç/Özsermaye, Net Kâr Marjı, Özet Skor için göreli en iyi=yeşil/en kötü=kırmızı; RSI için mutlak sağlık eşiklerine göre renklendirme).

**AC3 — Hisse çıkarma**
- **And** kullanıcı karşılaştırmadan bir hisseyi çıkarabilir (seçili çip listesinden kaldırma; tablo temizlenir, kullanıcı yeniden "Karşılaştır"a basar).

## Definition of Done

- [x] AC1–AC3 karşılanıyor ve doğrulandı (backend: pytest 201/201 yeşil + ruff temiz; web: typecheck/lint/build yeşil; mobil: typecheck/lint + Metro bundle yeşil).
- [x] BIST sembolü karşılaştırmaya eklendiğinde çökme yok, net bir uyarı ile yer tutucu satır gösteriliyor.
- [x] **Canlı uçtan uca doğrulandı:** Gerçek Finnhub/TwelveData verisiyle `GET /compare?symbols=AAPL:US,MSFT:US` başarıyla F/K, RSI ve özet skor değerleri döndü; karışık `AAPL:US,THYAO:BIST` isteği BIST uyarısıyla 200 döndü; 1 sembol ve 5 sembol istekleri 400 ile reddedildi.

## Teknik Notlar

- `compare_symbols`, ABD sembollerini `asyncio.gather` ile paralel işler; BIST sembolleri senkron ve ucuz olduğundan ayrıca paralelleştirilmiyor.
- Tabloda göreli en iyi/en kötü vurgusu yalnızca **en az 2 tanımlı (None olmayan) değer varsa ve bu değerler birbirinden farklıysa** uygulanır — tüm değerler eşitse veya yalnızca 1 sembolde veri varsa hiçbir hücre vurgulanmaz (yanlış "kazanan" izlenimi vermemek için).
- Web'de yeniden kullanılabilir bir `SearchBox` bileşeni yerine `compare-view.tsx` içinde küçük, özel bir debounce arama mantığı yazıldı — çünkü mevcut `SearchBox`, sonuçlara tıklandığında `/stock/...` sayfasına yönlendiriyor (`Link`), karşılaştırma ekranının ihtiyacı olan "listeye ekle" davranışı farklı; kod tekrarı, gereksiz bir soyutlamadan (prop ile davranış değiştirmekten) tercih edildi.
