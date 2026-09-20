---
title: "Story 9.4: Birleşik Değerlendirme AI Raporu"
epic: "Epic 9 — AI Destekli Yorum ve Örüntü Tanıma"
story_id: "9.4"
status: done
created: 2026-09-20
updated: 2026-09-20
author: "Claude (retroaktif olarak belgelendi — kod 2026-09-19'da, bu story dosyası açılmadan yazılmıştı; mobil görev #7 aynı gün, bu dosya açıldıktan sonra tamamlandı)"
based_on: ["docs/stories/story-9.1.md", "docs/stories/story-9.2.md", "commit 8244f9d", "commit 352bea3"]
depends_on: ["9.1", "9.2"]
---

# Story 9.4: Birleşik Değerlendirme AI Raporu

## Kullanıcı Hikayesi

As a **kullanıcı (premium)**,
I want hisse detay sayfasındaki AI Analiz sekmesinde, temel ve teknik raporların birbiriyle uyumlu mu yoksa çelişkili mi olduğunu özetleyen tek bir "ortak değerlendirme" görmek,
So that iki ayrı raporu kendim okuyup karşılaştırmak zorunda kalmadan hızlıca genel tabloyu anlayabileyim.

*(Kaynak: bu story, `docs/epics.md`/`docs/PRD.md`'de önceden tanımlanmış bir FR'ye dayanmıyor — kullanıcının 2026-09-19'da doğrudan koda yazdırdığı bir genişleme. Bu dosya, [[project_bmad_workflow]] anısında not edilen "retroaktif story eksikliği" bulgusunu kapatmak için sonradan (2026-09-20) yazıldı; AC'ler koddan çıkarıldı, önceden yazılıp da uygulanmamış bir tasarım değil.)*

## Bağlam

Story 9.1 (temel analiz) ve 9.2 (teknik/CV) raporları hisse detay sayfasında iki ayrı panel olarak yan yana duruyordu; kullanıcı ikisini okuyup "bu ikisi aynı yönü mü işaret ediyor" sorusunu kendisi cevaplamak zorundaydı. Bu story, ikisini okuyup **tek bir sentezleyici görüş** üreten üçüncü bir rapor türü ekliyor — yeni bir veri toplama katmanı yok, yalnızca 9.1/9.2'nin zaten ürettiği (veya önbellekten okuduğu) iki raporu bir araya getirip Gemini'ye "bunlar aynı yöne mi işaret ediyor, nereye dikkat etmeli" diye soruyor.

Aynı gün (2026-09-19), AI Analiz sekmesindeki ağ hatası mesajlaşması da düzeltildi (`352bea3`): tarayıcının ham ağ hatası metni (örn. Safari'nin "Load failed" ifadesi) doğrudan kullanıcıya sızıyordu, özellikle teknik rapor 20-40 saniye sürebildiği için bu duruma daha sık düşülüyordu. Bu düzeltme, bu story'nin ürettiği üçüncü panelle aynı dosyaları (`ai-analysis-panel.tsx`, `ai-reports-client.ts`) değiştirdiği ve aynı "AI Analiz sekmesi" iş parçasının bir parçası olduğu için ayrı bir story açmak yerine burada belgeleniyor.

**Sağlayıcı:** Story 9.1 ile aynı — Google Gemini API, paylaşılan `app/ai_reports.py::call_gemini()` üzerinden (bkz. `docs/stories/story-9.1.md` Bağlam).

## Kapsam

- **Backend:**
  - `apps/api/migrations/0012_ai_reports_combined_type.sql` — `ai_reports.report_type` check kısıtına `'combined'` değeri eklendi (yeni tablo değil, mevcut `ai_reports` global önbelleğinin bir üçüncü rapor türü).
  - Yeni `app/ai_combined.py::get_combined_report()`: `get_fundamental_report()` ve `get_technical_report()`'u **eşzamanlı** (`asyncio.gather`) çağırır — ikisi de zaten kendi önbellek/BIST kontrolünü yapıyor; ikisi hazır olduğunda "bülten editörü" değil "finansal analist" sistem prompt'uyla Gemini'den 2-3 paragraflık bir sentez ister. TTL: 5 saat (ikisinin daha oynak olanı olan teknik raporun TTL'siyle aynı).
  - `GET /symbols/ai-report/combined` uç noktası (`main.py`): entitlement kontrolü (mevcut `ai_reports` bayrağı, yeni alan yok), `AIReportUnavailableError`/`psycopg.Error` durumunda `warnings` listesiyle döner (9.1/9.2 ile aynı desen).
- **Web:** AI Analiz sekmesinde yeni `CombinedReportCard` — sekme sırası **birleşik → teknik → temel → deterministik skor** olacak şekilde yeniden düzenlendi (önceden deterministik skor en üstteydi). Aynı "Rapor Oluştur" tetikleme deseni.
  - `ai-reports-client.ts::fetchReport()`: ağ seviyesi hatalar artık boş bir `Error()` fırlatıyor (ham tarayıcı mesajı yerine); çağıran kartlar bu durumda kendi genel "veri şu an sağlanamıyor" mesajına düşüyor. Teknik rapor kartına "bu daha uzun sürebilir" ipucu eklendi.

**Mobil (2026-09-20'de tamamlandı, bu story dosyasının açılmasından sonra):**
- `apps/mobile/lib/ai-reports-client.ts`: `CombinedAIReport` tipi + `fetchCombinedAIReport()` eklendi; `fetchReport()`'a web'in `352bea3` düzeltmesiyle aynı ağ-hatası normalizasyonu taşındı (React Native'in `fetch`'i de bağlantı hatasında ham bir exception fırlatıyor, mobil bu sınıfa açıktı).
- `apps/mobile/screens/AIAnalysisPanel.tsx`: mevcut generic `ReportCard<T>` bileşeni üçüncü kez (birleşik rapor için) kullanıldı — web'deki gibi üç ayrı bileşen kopyalanmadı. Panel sırası web ile eşitlendi: birleşik → teknik → temel → deterministik skor. `ReportCard`'a opsiyonel `generatingHint` prop'u eklendi, yalnızca teknik kartta `t.technicalGeneratingHint` ile kullanıldı.
- **Yan bulgu:** `ReportCard`'ın hata yakalama bloğu (`err instanceof Error ? err.message : ...`) mesaj boşluğunu kontrol etmiyordu — web'in `352bea3`'te düzelttiği tam sınıf hata mobilde de vardı (yeni boş `Error()` fırlatma yoluyla tetiklenebilirdi). `err instanceof Error && err.message ? ...` olarak düzeltildi, web'le birebir aynı.
- i18n: yeni anahtar gerekmedi — `combinedTitle`/`combinedDisclaimer`/`technicalGeneratingHint` zaten `packages/shared`'da mevcuttu (workspace paketi ortak).

**Kapsam dışı / bilinen eksik:**
- `GET /symbols/ai-report/combined` uç noktası için otomatik test suite'inde ayrı bir HTTP-seviyesi test yok (yalnızca `app/ai_combined.py::get_combined_report()` için 3 birim testi var, `app/tests/test_ai_combined.py`); bu revizyonda (2026-09-20) elle/canlı doğrulandı (bkz. DoD) ama otomatik teste eklenmedi.
- Mobil tarafta gerçek cihaz/simülatör görsel doğrulaması yapılmadı (bkz. DoD) — bu, projede zaten tekrarlanan, kullanıcının kendisinin yapması gereken bir açık madde ([[project_theme_system]]'de de aynı sınırlama not edilmiş).

## Görevler

1. **[Backend]** `apps/api/migrations/0012_ai_reports_combined_type.sql`. ✅ — commit `8244f9d`; 2026-09-20'de canlı Supabase'de `ai_reports_report_type_check` kısıtı doğrudan sorgulanarak `'combined'` değerinin izinli olduğu doğrulandı.
2. **[Backend]** `app/ai_combined.py`: eşzamanlı toplama + sentez prompt'u + önbellek. ✅
3. **[Backend]** `GET /symbols/ai-report/combined` uç noktası (`main.py`). ✅
4. **[Backend]** Testler: `app/tests/test_ai_combined.py` (önbellekten dönme, cache-miss'te ikisini de üretme, alt rapor hatasının yukarı yayılması) — 3 test, mock'lu. ✅ — endpoint/403 seviyesinde otomatik test yok, ama 2026-09-20'de canlı gerçek kullanıcılarla elle doğrulandı (bkz. DoD).
5. **[Web]** `CombinedReportCard` + sekme sırası değişikliği (`ai-analysis-panel.tsx`). ✅
6. **[Web]** Ağ hatası normalizasyonu (`ai-reports-client.ts::fetchReport`) + teknik rapor için "uzun sürebilir" ipucu. ✅ — commit `352bea3`.
7. **[Mobil]** Aynı panel, `StockOverviewScreen`'de (`AIAnalysisPanel.tsx` üzerinden). ✅ — 2026-09-20'de tamamlandı.

## Kabul Kriterleri

**AC1 — Sentez üretimi**
- **Given** premium bir kullanıcı hisse detay sayfasını açar, **When** "Ortak Değerlendirme"yi (birleşik rapor) talep ederse, **Then** temel ve teknik raporlar (hazır değillerse önce ikisi üretilir) okunarak, ikisinin uyumlu mu çelişkili mi olduğunu özetleyen bir Gemini sentezi gösterilir.

**AC2 — Premium kilidi (backend zorlamalı)**
- **Given** ücretsiz katmandaki bir kullanıcı, **When** aynı isteği yaparsa, **Then** backend 403 döner (mevcut `ai_reports` entitlement bayrağıyla, Story 9.1/9.2 ile aynı).

**AC3 — Şeffaflık ve maliyet kontrolü**
- **And** raporun altında "yatırım tavsiyesi değildir" ibaresi yer alır.
- **And** aynı sembol için art arda gelen istekler, alt raporlar zaten önbellekteyse Gemini'yi yalnızca sentez adımı için bir kez tetikler; sentezin kendisi de 5 saatlik TTL ile önbelleğe alınır.

**AC4 — Hata mesajları yerelleştirilmiş**
- **Given** bir ağ seviyesi hata (timeout, bağlantı kopması), **When** herhangi bir AI rapor kartı bunu yakalarsa, **Then** kullanıcıya tarayıcının ham/yerelleştirilmemiş hata metni değil, uygulamanın kendi "veri şu an sağlanamıyor" mesajı gösterilir.

## Definition of Done

- [x] AC1, AC3, AC4 koda yazıldı; AC1/AC3 mock'lu testlerle doğrulandı (`test_ai_combined.py`).
- [x] **AC2 (403) canlı doğrulandı** (2026-09-20) — `get_combined_ai_report_endpoint()` doğrudan, gerçek bir ücretsiz kullanıcının (`entitlements` tablosunda kaydı olmayan/`free` satırlı) `user_id`'siyle çağrıldı, 403 + doğru Türkçe mesaj alındı.
- [x] **AC1 gerçek Gemini API anahtarıyla canlı uçtan uca doğrulandı** (2026-09-20) — aynı endpoint fonksiyonu gerçek bir premium kullanıcıyla çağrıldı: ilk çağrı AAPL için `cached=False` ile yeni bir sentez raporu üretti, ikinci çağrı aynı `generated_at` ile `cached=True` döndü.
- [x] `0012` migration'ının canlı Supabase'e uygulandığı doğrulandı (2026-09-20 — `ai_reports_report_type_check` kısıtı sorgulanarak).
- [x] Backend testleri yeşil + ruff temiz (316/316, 2026-09-20 itibarıyla — bu story'nin kendi testleri dahil).
- [x] Web: typecheck, lint, build yeşil (2026-09-20'de doğrulandı, bu story'nin dosyaları dahil genel proje taraması ile).
- [x] Mobil: typecheck, lint yeşil; Metro bundle yeşil (778 modül, 2026-09-20).
- [x] **Gerçek tarayıcıda görsel doğrulama** (2026-09-20) — Claude tarafından, headless Chromium (Playwright) ile: lokal `next start` (production build) + lokal `uvicorn` çalıştırılıp, canlı Supabase'de oluşturulan tek kullanımlık bir premium test kullanıcısıyla (`trendus-visual-check-20260920@example.com`, test sonrası `entitlements` satırı silindi) `/stock/US/AAPL` → AI Analysis sekmesi hem koyu hem açık modda doğrulandı: panel sırası (Combined Assessment → Technical → Fundamental → Deterministic Score) doğru, "Generate Report" akışı, "Generating report…" iskelet durumu, ve gerçek (önbellekten) bir Gemini sentez raporu ("This report was generated earlier and is shown from cache" notuyla) eksiksiz ve doğru renklerle render edildi. Ekran görüntüleri: `04-ai-tab-initial.png`, `05-ai-tab-combined-loading.png`, `06-ai-tab-combined-loaded.png`, `07-ai-tab-light.png`, `08-ai-tab-light-combined.png`.
- [ ] **Mobil gerçek cihaz/simülatör doğrulaması** — bu ortamda ne Xcode/`simctl` ne Android emulator mevcut; Expo web önizlemesi de `react-native-web` bağımlılığı gerektirdiğinden (kullanıcı, salt bu test için eklenmesini istemedi) denenmedi. Kullanıcı kendi cihazında/simülatöründe denemeli.

## Teknik Notlar

- **Neden ayrı bir tablo değil:** `ai_reports` zaten sembol+borsa+rapor-türü bazlı genel bir önbellek şeması; `combined` yalnızca `report_type` check kısıtına eklenen üçüncü bir değer, yeni bir migration şeması gerekmedi.
- **Eşzamanlılık:** `asyncio.gather(get_fundamental_report(...), get_technical_report(...))` — ikisi de kendi içinde önbellek kontrolü yaptığından, ikisi de zaten önbellekteyse bu adım gecikme eklemez; ikisi de soğuksa iki LLM/CV çağrısı paralel çalışır (sıralı değil).
- **Retroaktif belgeleme notu:** Bu story dosyası, kodun yazılmasından bir gün sonra (2026-09-20) açıldı — [[project_bmad_workflow]] anısında işaretlenen "son 4 özellik BMAD sürecinin dışında kalmış" bulgusunun bir parçası. Buradaki AC/Görev/DoD, koddan geriye doğru çıkarıldı; ileriye dönük bir tasarım kararı değil.
- **Test verisi artığı:** Görsel doğrulama için oluşturulan `trendus-visual-check-20260920@example.com` Supabase auth kullanıcısı, `entitlements` satırı silinmiş olsa da (artık `free` tier) auth sisteminde duruyor — projede bir `SUPABASE_SERVICE_ROLE_KEY` olmadığından (yalnızca `anon key`) admin API ile kullanıcı silinemedi. Zararsız (girişte kullanılan gerçek bir kimlik değil, entitlement'ı yok) ama temizlik isteniyorsa Supabase Dashboard'dan elle silinebilir.
- **Mobilin web'den daha DRY olması:** Web, üç neredeyse özdeş bileşen (`CombinedReportCard`/`TechnicalReportCard`/`FundamentalReportCard`) kopyalayarak yazıldı; mobil ise baştan beri tek bir generic `ReportCard<T extends { report: string; cached: boolean }>` bileşenini üç farklı `fetcher` ile kullanıyordu. Mobil tarafı genişletirken bu deseni bozmadık — web'i mobile kopyalamak yerine, mobilin zaten sahip olduğu generic bileşene üçüncü bir kullanım eklendi.
