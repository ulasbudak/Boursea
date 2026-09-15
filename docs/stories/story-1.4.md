---
title: "Story 1.4: Hisse Arama"
epic: "Epic 1 — Kimlik Doğrulama, Hisse Keşfi ve Temel Altyapı"
story_id: "1.4"
status: done
created: 2026-09-15
updated: 2026-09-15
author: Bob (BMAD Scrum Master)
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md"]
depends_on: ["1.1", "1.2"]
---

# Story 1.4: Hisse Arama

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want sembol veya şirket adına göre ABD ve BIST hisselerini arayabilmek,
So that ilgilendiğim hisseyi hızlıca bulabileyim.

*(Kaynak: `docs/epics.md` §5, Epic 1 — Story 1.4; PRD FR-001.)*

**Not:** Backlog sırasında Story 1.3 (Dil Seçimi ve Yerelleştirme) atlanıp doğrudan bu story'ye geçildi — kullanıcı kararı. Story 1.3 backlog'da açık kalmaya devam ediyor.

## Bağlam

Bu story, `docs/architecture.md`'de tanımlanan **`market_data`** modülünü ilk kez hayata geçirir (AD-5: Piyasa Verisi Sağlayıcı Soyutlaması). İki ayrı kaynağı tek bir arama arayüzü arkasında birleştirir:

- **ABD hisseleri:** Finnhub `/search` endpoint'i (canlı sembol dizini + arama).
- **BIST hisseleri:** Gerçek zamanlı/lisanslı bir BIST veri sağlayıcısı kararı henüz verilmedi (bkz. `architecture.md` §11 — Ertelenen Kararlar). Ancak **sembol arama, fiyat verisi gerektirmez** — yalnızca bir sembol/şirket adı dizinine ihtiyaç var. Bu nedenle MVP'de BIST tarafı, uygulamayla birlikte paketlenen **statik bir BIST100 ağırlıklı sembol listesiyle** çözülür; bu, gelecekte gerçek zamanlı BIST fiyat sağlayıcısı kararından bağımsızdır ve AD-5'teki adaptör arayüzüyle uyumludur (ileride canlı bir dizin servisiyle değiştirilebilir).

## Kapsam

- **Backend:** `GET /symbols/search?q=&exchange=` — BIST (statik dizin) ve ABD (Finnhub, canlı) sonuçlarını birleştirip döner.
- **Web:** `/dashboard` sayfasına arama kutusu; sonuçlar borsa etiketiyle listelenir.
- **Mobil:** Ana ekrana (oturum açık) arama kutusu; aynı davranış.

**Kapsam dışı:**
- Hisse detay sayfası (Story 1.5) — arama sonucuna tıklamak bu story'de bir yere yönlendirmez, sadece sonucu gösterir.
- BIST için gerçek zamanlı/lisanslı veri sağlayıcı entegrasyonu — ayrı, iş kararı gerektiren bir story (bkz. `architecture.md` Ertelenen Kararlar).
- Arama geçmişi / öneri (autocomplete) kalıcılığı.

## Görevler

1. **[Backend]** `app/data/bist_symbols.json` — BIST100 ağırlıklı statik sembol/şirket adı dizini.
2. **[Backend]** `app/market_data.py`: `SymbolResult` modeli, `search_bist_symbols()` (önek → alt dize → yazım hatası toleranslı bulanık eşleştirme), `search_us_symbols()` (Finnhub `/search`, `httpx.AsyncClient`, API anahtarı yoksa/istek başarısızsa sessiz değil açık hata).
3. **[Backend]** `GET /symbols/search` endpoint'i: `exchange` filtresine göre kaynakları birleştirir; başarısız kaynak varsa `warnings` alanında bildirir, diğer kaynağın sonuçlarını yine de döner.
4. **[Backend]** CORS middleware (web/mobil'in tarayıcıdan/uygulamadan doğrudan çağırabilmesi için).
5. **[Backend]** Birim testleri: önek/alt dize/bulanık eşleştirme senaryoları, Finnhub başarı/hata senaryoları (mock'lanmış HTTP), endpoint entegrasyon testleri.
6. **[Web]** `SearchBox` client component'i (debounce'lu arama, sonuç listesi, boş/hata durumları); `/dashboard`'a eklenir.
7. **[Mobil]** Aynı davranışta bir arama ekranı/bölümü; `HomeScreen`'e eklenir.
8. **[Hepsi]** `.env.example` → `FINNHUB_API_KEY` eklenir; README güncellenir.

## Kabul Kriterleri

**AC1 — Arama sonuçları borsa etiketiyle listelenir**
- **Given** arama kutusu, **When** kullanıcı bir sembol veya şirket adı yazarsa, **Then** eşleşen sonuçlar `BIST` veya `US` etiketiyle listelenir (FR-001).
- **And** BIST sonuçları (statik dizinden) ağ çağrısı gerektirmediği için anında (<100ms sunucu tarafı işlem süresi) döner; ABD sonuçları Finnhub'a bağımlı olduğundan makul bir zaman aşımı (3sn) ile sınırlanır — dış servis gecikmesi bu story'nin kontrolü dışındadır ve NFR-1'in "birkaç saniye" hedefiyle uyumludur.

**AC2 — Kısmi/hatalı yazım toleransı**
- **Given** kısmi bir sembol (örn. "GAR"), **When** arama yapılırsa, **Then** önekle eşleşen semboller (örn. GARAN) listelenir.
- **Given** küçük bir yazım hatası içeren sorgu (örn. "GARAB"), **When** tam eşleşme/önek/alt dize bulunamazsa, **Then** bulanık eşleştirme ile en yakın sembol (GARAN) önerilir.

**AC3 — Sonuç bulunamama durumu**
- **Given** hiçbir kaynakta eşleşme yoksa, **When** arama tamamlanırsa, **Then** boş bir sonuç listesi döner (hata değil) ve arayüzde "sonuç bulunamadı" durumu net şekilde gösterilir.

**AC4 — Kısmi kaynak hatası sessiz geçilmez**
- **Given** `FINNHUB_API_KEY` yapılandırılmamış veya Finnhub isteği başarısız olursa, **When** arama yapılırsa, **Then** BIST sonuçları yine de döner ve yanıtta ABD kaynağının şu an kullanılamadığını belirten bir `warnings` girdisi bulunur; sessiz bir boş sonuç göstermez.

## Definition of Done

- [x] AC1–AC4 karşılanıyor ve doğrulandı (backend: pytest 21/21 + canlı `uvicorn` smoke test; web: typecheck/lint/build + CORS canlı testi; mobil: typecheck/lint + Metro bundle testi).
- [x] `FINNHUB_API_KEY` olmadan da uygulama çökmüyor — yalnızca BIST sonuçları + açık bir uyarı döner (canlı doğrulandı).
- [x] `.env.example` güncellendi; gerçek API anahtarı commit edilmedi.

## Teknik Notlar

- Finnhub endpoint: `GET https://finnhub.io/api/v1/search?q={query}&token={api_key}` → `{"count": N, "result": [{"description", "displaySymbol", "symbol", "type"}]}` (resmi Finnhub OpenAPI şemasından doğrulandı, 2026).
- BIST statik dizin, gerçek zamanlı BIST veri sağlayıcı kararından (Foreks/Matriks/Algolab) bağımsızdır; o karar netleştiğinde bu dizin bir canlı sembol servisiyle değiştirilebilir (AD-5 adaptör deseni sayesinde çağıran kodda değişiklik gerekmez).
