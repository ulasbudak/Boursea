---
title: "Story 9.1: Temel Analiz AI Raporu"
epic: "Epic 9 — AI Destekli Yorum ve Örüntü Tanıma"
story_id: "9.1"
status: in-progress
created: 2026-09-16
updated: 2026-09-18
author: Mary (BMAD Business Analyst) & Bob (BMAD Scrum Master) — Serdar Ulaş Budak ile birlikte
based_on: ["docs/PRD.md §5.11", "docs/epics.md §13", "docs/product-brief-epic9-ai.md §\"2026-09-18 Güncellemesi\""]
depends_on: ["2.1", "2.2", "2.3", "8.1"]
---

# Story 9.1: Temel Analiz AI Raporu

## Kullanıcı Hikayesi

As a **kullanıcı (premium)**,
I want hisse detay sayfasında, uygulamanın kendi temel verisine dayanan bir AI temel analiz raporu okumak,
So that sayıları tek tek yorumlamadan hissenin temel görünümünü hızlıca anlayabileyim.

*(Kaynak: `docs/epics.md` §13, Epic 9 — Story 9.1; PRD FR-100.)*

## Bağlam

Bu story, 2026-09-16'da yazılan orijinal taslağın ("Serbest Formatlı AI Hisse Yorumu" — haber bazlı genel yorum) yerine, kullanıcının 2026-09-18'de somutlaştırdığı kapsamla değiştirildi: artık özel olarak **temel analiz** odaklı, ayrı ve açıkça etiketlenmiş bir rapor. Hisse detay sayfasında bu, Story 9.2'nin teknik AI raporu ve mevcut deterministik skorun (Story 3.6/3.7) yanında üçüncü bir panel olarak gösterilecek.

Bu, projenin **ilk LLM entegrasyonu**. Sağlayıcı kararı verildi: **Anthropic Claude API** (kullanıcı kararı — "Claude'un finans skill'i" adlı ayrı bir ürün doğrulanamadı, bunun yerine Claude API'si kendi yazacağımız bir "finansal analist" sistem prompt'uyla kullanılacak). Kullanıcının console.anthropic.com'da **ayrı bir hesap** açıp API anahtarı alması gerekiyor — claude.ai Pro aboneliği ($20/ay) API erişimi içermiyor, ayrı pay-as-you-go faturalama gerektiriyor.

**Neden grounding zorunlu:** Karar gerekçesi `docs/product-brief-epic9-ai.md`'de detaylandırıldı — özetle, kendi verimiz olmadan (salt LLM eğitim verisiyle) üretilen bir yorum hem güncelliğini kaybeder hem de halüsinasyon/"yatırım tavsiyesi" riski taşır. Bu yüzden AC'lerde temel veri yetersizse rapor **üretilmez**, "yeterli veri yok" gösterilir.

**Haber verisi kapsam dışı:** Orijinal taslaktaki Finnhub `company-news` entegrasyonu bu story'den çıkarıldı — temel analiz raporu yalnızca uygulamanın kendi hesapladığı sayısal temel veriye (Epic 2 çıktısı) dayanıyor, haber grounding'i gerektirmiyor. (İleride ayrı bir genişleme olarak değerlendirilebilir, bu story'nin kapsamında değil.)

**BIST kapsamı:** Mevcut mimari kararla tutarlı olarak (Story 1.4'ten beri), BIST için canlı temel veri kaynağı yok. Bu story kapsamında BIST için "veri yok" uyarısı döner.

## Kapsam

- **Backend:**
  - Yeni migration: `ai_reports` tablosu (`symbol`, `exchange`, `report_type`, `content` jsonb, `generated_at`) — sembol+borsa+rapor-türü bazlı **global önbellek** (kullanıcı bazlı değil; aynı hisseye bakan farklı kullanıcılar aynı raporu paylaşır, LLM API maliyetini kontrol eder).
  - `app/config.py`'ye `ANTHROPIC_API_KEY` ayarı (mevcut `FINNHUB_API_KEY` deseniyle aynı).
  - `app/entitlements.py`'deki `Entitlement` modeline `ai_reports: bool` alanı (free: `false`, premium: `true`).
  - Yeni `app/ai_fundamental.py`: `app/fundamentals.py`'den (Story 2.1-2.3) zemin verisi toplama → Anthropic Messages API'sine `httpx.AsyncClient` ile istek (SDK yok, mevcut Finnhub/Twelve Data deseniyle tutarlı) → önbellek okuma/yazma (TTL: 24 saat).
  - `GET /symbols/ai-report/fundamental` uç noktası: entitlement kontrolü (403 free kullanıcıda), önbellek varsa döndür, yoksa üret+kaydet+döndür, veri yetersizse "yeterli veri yok".
- **Web/Mobil:** Hisse detay sayfasında "Temel Analiz AI Raporu" paneli (Story 9.2'nin teknik paneli ve mevcut skor rozetiyle birlikte, ortak bir "AI Analiz" bölümünde); "Rapor Oluştur" butonu (otomatik değil, açık istek — LLM çağrısı gecikme/maliyet taşıdığı için); premium kilit durumu (Story 8.1'deki kilit deseniyle aynı).

**Kapsam dışı:**
- Haber grounding'i (Finnhub `company-news`) — orijinal taslaktan çıkarıldı, bu story kapsamında değil.
- Tarama, portföy, ana ekran yerleşimleri (yalnızca hisse detay sayfası).
- Sohbet/chat arayüzü.
- BIST için temel veri kaynağı entegrasyonu.

## Görevler

1. **[Kullanıcı]** Anthropic API anahtarı sağlanmalı (console.anthropic.com, ayrı hesap). ☐ — kullanıcı bu adımı sonraya bıraktı (2026-09-18), canlı doğrulama bu anahtar sağlandığında yapılacak.
2. **[Backend]** `apps/api/migrations/0009_ai_reports.sql`: `ai_reports` tablosu. ✅ — canlı Supabase'e uygulandı.
3. **[Backend]** `app/config.py`: `ANTHROPIC_API_KEY`. ✅
4. **[Backend]** `app/entitlements.py`: `Entitlement.ai_reports` alanı + `get_entitlement()` güncellemesi. ✅
5. **[Backend]** `app/ai_fundamental.py`: zemin verisi toplama + Anthropic API çağrısı ("finansal analist" sistem prompt'u) + önbellek. ✅ — koda yazıldı, gerçek Anthropic anahtarıyla henüz canlı çağrılmadı.
6. **[Backend]** `GET /symbols/ai-report/fundamental` uç noktası (`main.py`). ✅ — 403 davranışı canlı doğrulandı (bkz. DoD).
7. **[Backend]** Testler: veri var/yok senaryoları, premium/ücretsiz erişim kontrolü (403), BIST uyarısı, LLM çağrısı hata durumu, önbellekten dönme senaryosu — hepsi mock'lu (gerçek API çağrısı test ortamında yapılmaz). ✅
8. **[Web]** Hisse detay sayfasına "AI Analiz" bölümü içinde "Temel Analiz AI Raporu" paneli + kilit UI'ı + "Rapor Oluştur" butonu. ✅
9. **[Mobil]** Aynı panel, `StockOverviewScreen`'de. ✅

## Kabul Kriterleri

**AC1 — Rapor üretimi**
- **Given** premium bir kullanıcı bir hisse detay sayfasını açar, **When** "Temel Analiz AI Raporu"nu talep ederse, **Then** Anthropic Claude API'sine, uygulamanın kendi temel verisi zemine alınarak (RAG) üretilmiş bir rapor gösterilir (FR-100).

**AC2 — Premium kilidi (backend zorlamalı)**
- **Given** ücretsiz katmandaki bir kullanıcı, **When** aynı bölüme gelirse, **Then** özellik kilitli gösterilir ve premium yükseltme teklifiyle karşılaşır (FR-080); **And** aynı isteği doğrudan API'ye yapsa bile backend 403 döner (yalnızca istemci tarafı gizleme yeterli değil — gerçek API maliyeti var).

**AC3 — Veri yoksa üretilmez**
- **Given** ilgili hisse için temel veri yetersizse (örn. BIST), **When** rapor üretilmeye çalışılırsa, **Then** "yeterli veri yok" durumu gösterilir; veri olmadan bir rapor üretilmez.

**AC4 — Şeffaflık, sorumluluk reddi ve maliyet kontrolü**
- **And** raporun altında sabit olarak "yatırım tavsiyesi değildir" ibaresi yer alır.
- **And** aynı sembol için art arda gelen istekler LLM API'sini her seferinde tetiklemez — 24 saatlik TTL'li global önbellekten döner.

## Definition of Done

- [x] AC1, AC3, AC4 koda yazıldı ve mock'lu testlerle doğrulandı; AC2 (premium kilidi) canlı doğrulandı.
- [x] Migration canlı Supabase'e uygulandı.
- [x] Backend testleri yeşil + ruff temiz (281/281 test).
- [x] Web: typecheck, lint, build yeşil.
- [x] Mobil: typecheck, lint, Metro bundle yeşil.
- [ ] **Gerçek Anthropic API anahtarıyla canlı uçtan uca doğrulandı** (rapor üretimi + ikinci istekte önbellekten dönme) — **açık madde**, kullanıcı Anthropic API anahtarını sağladığında yapılacak (2026-09-18'de bilinçli olarak sonraya bırakıldı).
- [x] **Ücretsiz katman kullanıcısıyla 403 doğrulandı** — taze bir Supabase kullanıcısıyla gerçek JWT üzerinden canlı çağrıldı, doğru Türkçe mesajla 403 alındı.
- [ ] Regülasyon riski (bkz. `docs/product-brief-epic9-ai.md` §"Yatırımcı Sunumundan Önce Kapatılması Gereken Risk") için hukuki teyit — yatırımcı sunumundan önce, bu story'nin geliştirme aşamasını bloklamıyor.
- [ ] Gerçek tarayıcıda/cihazda görsel doğrulama — kullanıcı bizzat denemeli.

## Teknik Notlar

- **Maliyet kontrolü:** Global önbellek (kullanıcı bazlı değil) — Story 4.1'deki işlem-içi TTL önbellek deseninden farklı olarak, burada kalıcı bir DB tablosu kullanılıyor çünkü TTL (24 saat) tek bir isteğin ömründen çok daha uzun.
- **SDK yok:** Anthropic Messages API'si `httpx.AsyncClient` ile doğrudan çağrılacak — Finnhub/Twelve Data ile aynı desen, yeni bir SDK bağımlılığı eklenmiyor.
- **Celery/Redis kullanılmıyor:** Mimaride planlanmış olsa da (AD-8) hiçbir story bugüne kadar bunu kurmadı; rapor üretimi senkron, istek-anında.
- **Prompt/veri sızıntısı riski:** Prompt'a yalnızca uygulamanın kendi hesapladığı sayısal temel veriler enjekte edilmeli; kullanıcıya özel veri (portföy, not) bu story kapsamında prompt'a dahil edilmez.
- **Hata davranışı:** LLM sağlayıcı hatası/timeout durumunda sessiz hata yerine mevcut desenle tutarlı ("veri şu an sağlanamıyor" tarzı) bir uyarı gösterilmeli.
