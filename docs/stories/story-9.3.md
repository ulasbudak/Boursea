---
title: "Story 9.3: Günlük Sektör Bülteni"
epic: "Epic 9 — AI Destekli Yorum ve Örüntü Tanıma"
story_id: "9.3"
status: done
created: 2026-09-19
updated: 2026-09-20
author: Bob (BMAD Scrum Master) & Amelia (BMAD Developer)
based_on: ["docs/PRD.md §5.11", "docs/epics.md §13", "docs/product-brief-epic9-ai.md"]
depends_on: ["7.1", "8.1", "9.1"]
---

# Story 9.3: Günlük Sektör Bülteni

## Kullanıcı Hikayesi

As a **kullanıcı (premium)**,
I want ana ekranda her gün yeni eklenen, geçmişi silinmeyen bir AI sektör bülteni görmek,
So that hangi sektörlerin/hisselerin öne çıktığını zaman içinde takip edebileyim.

*(Kaynak: kullanıcı isteği, 2026-09-19 — Epic 9'un dördüncü AI özelliği; ayrı bir FR numarası açılmadı, FR-100'ün ("AI destekli yorum") kapsamının bir genişlemesi olarak ele alındı.)*

## Bağlam

Story 9.1/9.2'nin `ai_reports` tablosu **tek-satır upsert-cache** deseni (sembol+borsa+rapor türü başına bir satır, her yenilemede üzerine yazılır). Bu story kasıtlı olarak farklı bir veri deseni gerektiriyor: kullanıcı bültenlerin **hiç silinmemesini, her gün üstüne yeni bir tane eklenmesini** istedi — yani gerçek bir **append-only arşiv**. Bu yüzden ayrı bir `sector_bulletins` tablosu kuruldu (`bulletin_date` sütununda `unique` kısıtı, hiçbir `UPDATE`/`DELETE` yolu yok).

**Zamanlama kararı:** Projede hiçbir zaman bir cron/Celery altyapısı kurulmadı (bkz. `docs/architecture.md` AD-8 — planlandı ama hiç kurulmadı, her şey istek anında hesaplanıyor). Kullanıcıya bu durum açıklandı ve iki seçenek sunuldu: (a) istek anında üret + günlük önbellek (yeni altyapı yok), (b) gerçek zamanlanmış görev (Railway cron/GitHub Actions, ek operasyon yükü). Kullanıcı **(a)'yı seçti** — günün ilk isteğinde bülten üretilip kalıcı olarak eklenir, sabit bir saatte otomatik çıkmaz ama kullanıcı deneyimi açısından "günlük yenilenen bülten" gibi davranır.

**Sektör seçimi:** Her gün için sektör `ALL_SECTORS`'tan (11 sektör) `day_of_year % 11` ile deterministik rotasyonla seçiliyor — bir sektörü "bugün en iyisi" diye seçmek için tüm evreni taramak (yüzlerce Finnhub çağrısı) gerekmiyor, sıfır ek maliyetli ve açıklanabilir ("bugün sıradaki sektör").

**Hisse seçimi:** Seçilen sektördeki hisseler, mevcut kural bazlı skor motoruyla (`app/scoring.py`'nin `compute_us_score()`, Story 3.6/3.7) eşzamanlı olarak puanlanır (Story 7.1'in Highlights'ındaki iki aşamalı desen: statik `us_universe.json`'ı sektöre göre filtrele → yalnızca o alt küme için canlı veri çek), en yüksek 5 puanlı hisse "görece iyi hisseler" olarak seçilir.

**Anlatı:** Story 9.1'in LLM entegrasyonu (artık `app/ai_reports.py::call_gemini()` olarak paylaşılan bir yardımcı fonksiyon; 2026-09-19'da Anthropic'ten Gemini'ye geçirildi, bkz. `docs/stories/story-9.1.md` Bağlam) yeni bir "bülten editörü" sistem prompt'uyla tekrar kullanıldı — yalnızca verilen skor/etiket verisine dayanan, Türkçe bir bülten metni üretir.

## Kapsam

- **Backend:**
  - `apps/api/migrations/0010_sector_bulletins.sql` — `sector_bulletins` tablosu (append-only, `bulletin_date unique`).
  - `app/ai_reports.py`'ye `call_gemini()` eklendi (Story 9.1'in özel Anthropic çağrısından genelleştirildi, 2026-09-19'da Gemini'ye geçirildi, artık hem `app/ai_fundamental.py` hem `app/bulletins.py` kullanıyor).
  - `app/bulletins.py` (yeni): sektör rotasyonu, sektör-içi eşzamanlı skorlama, Gemini çağrısı, append-only kaydetme (eşzamanlı istek çakışmasına karşı `ON CONFLICT (bulletin_date) DO NOTHING` + geri okuma).
  - `GET /bulletins` uç noktası: entitlement kontrolü (mevcut `ai_reports` bayrağı, yeni bir alan eklenmedi), bugünün bülteni yoksa üretir, tüm arşivi (son 30 kayıt) döndürür.
- **Web/Mobil:** Dashboard'a (Highlights'ın altına) yeni bir "Bülten" bölümü — sayfa açılışında otomatik yüklenir (Highlights gibi, buton arkasına gizlenmez — kullanıcıya özel değil, günde bir kez üretilen paylaşılan içerik), premium kilit durumu.

**Kapsam dışı:**
- Gerçek zamanlanmış görev (cron/Railway job) — kullanıcı tarafından bilinçli olarak ertelendi.
- BIST sektörleri/hisseleri — canlı temel/teknik veri kaynağı yok (mevcut mimari kısıt, Story 1.4'ten beri tutarlı).
- Bülten arşivinin sayfalanması/sonsuz kaydırma — ilk sürümde sabit son-30-kayıt listesi.

## Görevler

1. **[Backend]** `apps/api/migrations/0010_sector_bulletins.sql`. ✅ — canlı Supabase'e uygulandı.
2. **[Backend]** `app/ai_reports.py::call_gemini()` — Story 9.1'in LLM çağrısı genelleştirildi, `app/ai_fundamental.py` bu yeni paylaşılan fonksiyona geçirildi (regresyon yok, testler yeşil). ✅
3. **[Backend]** `app/bulletins.py`: sektör rotasyonu, skorlama, anlatı üretimi, append-only kayıt. ✅
4. **[Backend]** `GET /bulletins` uç noktası (`main.py`). ✅
5. **[Backend]** Testler: rotasyonun deterministik olduğu ve bir yıl içinde tüm sektörleri kapsadığı, mevcut bülten varsa yeniden üretilmediği, aday yoksa hata, üretim+kayıt akışı, eşzamanlı ekleme çakışması, 403/401 — hepsi mock'lu. ✅ (290/290 test yeşil, ruff temiz.)
6. **[Web]** Dashboard'a "Bülten" bölümü + kilit UI'ı. ✅
7. **[Mobil]** `HomeScreen`'e aynı bölüm. ✅

## Kabul Kriterleri

**AC1 — Günlük üretim ve arşivleme**
- **Given** bugüne ait bir bülten satırı yoksa, **When** premium bir kullanıcı dashboard'u açarsa, **Then** deterministik rotasyonla seçilmiş bir sektör için, o sektördeki en yüksek skorlu 5 hissenin analiziyle yeni bir bülten üretilip kalıcı olarak eklenir.
- **And** ertesi gün başka bir istek geldiğinde, önceki günün bülteni **silinmez/üzerine yazılmaz** — yeni bir satır olarak eklenir, arşiv büyür.

**AC2 — Premium kilidi (backend zorlamalı)**
- **Given** ücretsiz katmandaki bir kullanıcı, **When** dashboard'u açarsa, **Then** bülten bölümü kilitli gösterilir; **And** backend `GET /bulletins` isteğini 403 ile reddeder.

**AC3 — Şeffaflık ve veri yetersizliği**
- **And** her bültenin sonunda "yapay zeka tarafından üretilmiştir, yatırım tavsiyesi değildir" ibaresi yer alır.
- **Given** seçilen sektörde puanlanabilir hiçbir hisse yoksa, **When** üretim denenirse, **Then** "yeterli veri yok" uyarısı gösterilir, o gün için hatalı/eksik bir satır kaydedilmez (bir sonraki istek tekrar dener).

## Definition of Done

- [x] AC1 (üretim + arşivleme mantığı), AC2 (403), AC3 koda yazıldı ve mock'lu testlerle doğrulandı.
- [x] Migration canlı Supabase'e uygulandı.
- [x] Backend testleri yeşil + ruff temiz (290/290).
- [x] Web: typecheck, lint, build yeşil.
- [x] Mobil: typecheck, lint, Metro bundle yeşil.
- [x] **Ücretsiz katman kullanıcısıyla 403 doğrulandı** — canlı, gerçek JWT üzerinden.
- [x] **Sektör rotasyonu + gerçek hisse skorlama canlı doğrulandı** — premium kullanıcıyla `GET /bulletins` çağrıldığında (LLM anahtarı henüz yoktu) pipeline sektör seçip gerçek Finnhub/Twelve Data verisiyle o sektördeki hisseleri skorladı, yalnızca son adımda ("ANTHROPIC_API_KEY is not configured") temiz bir uyarıyla durdu — 500 hatası yok, hatalı bir satır kaydedilmedi.
- [x] **Gerçek Gemini API anahtarıyla tam uçtan uca doğrulandı** (2026-09-20 — `get_or_create_todays_bulletin()`: ilk çağrı bugün için yeni bir bülten üretip Communication Services sektöründe kaydetti, ikinci çağrı aynı `created_at` ile aynı satırı döndürdü, ikinci bir satır eklenmedi).
- [x] **Web görsel doğrulama** (2026-09-21) — Claude tarafından, headless Chromium (Playwright) ile: dashboard'daki Bülten bölümünde arşivin (append-only) 3 farklı güne ait gerçek bültenleri (9/19 Utilities, 9/20 Communication Services, 9/21 Technology) doğru sırada ve içerikle gösterdiği doğrulandı; günün ilk isteğinde yeni bültenin (Technology, deterministik rotasyona uygun) canlı üretildiği gözlemlendi.
- [ ] Mobil doğrulama — bu ortamda gerçek simülatör/cihaz yok; kullanıcı bizzat denemeli.

## Teknik Notlar

- **Maliyet/gecikme:** Günün ilk isteği, sektördeki her aday hisse için (~5-20 sembol, `MAX_CONCURRENT_SCORING=15` eşzamanlılık sınırıyla) `compute_us_score()` + bir Gemini çağrısı yapıyor — birkaç saniye sürebilir. Sonraki tüm istekler DB'den anında okur. Story 9.1/9.2'nin "Rapor Oluştur" butonlu desenin aksine, bu bölüm sayfa açılışında otomatik yükleniyor çünkü kullanıcıya özel değil (günde bir kez üretilen paylaşılan içerik).
- **Eşzamanlı istek çakışması:** Günün ilk birkaç dakikasında iki kullanıcı aynı anda dashboard'u açarsa, her ikisi de "bugünün bülteni yok" görüp üretime başlayabilir. `sector_bulletins.bulletin_date`'in `unique` kısıtı + `INSERT ... ON CONFLICT (bulletin_date) DO NOTHING` bunu güvenli hale getiriyor: kaybeden istek, kazananın yazdığı satırı geri okuyup onu döndürüyor (test: `test_save_bulletin_handles_concurrent_insert_race`).
- **Yetkilendirme genişletmesi yok:** Yeni bir entitlement alanı eklenmedi — mevcut `Entitlement.ai_reports` bayrağı (Story 8.1) tekrar kullanıldı, bülten de kavramsal olarak bir AI raporu.
- **Kod paylaşımı:** `app/ai_reports.py::call_gemini()`, Story 9.1'in başlangıçta `app/ai_fundamental.py` içine özel yazılmış (ve 2026-09-19'da Anthropic'ten Gemini'ye geçirilmiş) LLM çağrısının genelleştirilmiş hali — artık iki farklı sistem prompt'uyla (temel analiz, bülten editörü) iki farklı modülden çağrılıyor.
