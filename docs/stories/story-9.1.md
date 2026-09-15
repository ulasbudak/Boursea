---
title: "Story 9.1: Serbest Formatlı AI Hisse Yorumu"
epic: "Epic 9 — AI Destekli Yorum ve Örüntü Tanıma"
story_id: "9.1"
status: planned
created: 2026-09-16
updated: 2026-09-16
author: Mary (BMAD Business Analyst)
based_on: ["docs/PRD.md §5.11", "docs/epics.md §13", "docs/product-brief-epic9-ai.md"]
depends_on: ["2.1", "8.1"]
---

# Story 9.1: Serbest Formatlı AI Hisse Yorumu

## Kullanıcı Hikayesi

As a **kullanıcı (premium)**,
I want hisse detay sayfasında, o hisseyle ilgili güncel haberlere dayanan bir AI yorumu okumak,
So that sadece sayılara bakmadan hissenin güncel bağlamını hızlıca anlayabileyim.

*(Kaynak: `docs/epics.md` §13, Epic 9 — Story 9.1; PRD FR-100.)*

## Bağlam

> **Ön koşul:** Epic 1-8 (Faz 1 MVP) tamamlanmadan bu story'ye başlanmaz — hem premium/freemium altyapısı (Epic 8) hem de temel veri katmanı (Epic 2) buna bağımlı.

Bu, projenin **ilk LLM entegrasyonu**. Şimdiye kadarki tüm veri akışı deterministik (Finnhub/Twelve Data'dan geçirilen sayısal veri, kural bazlı sinyal/skor motoru). Bu story ile birlikte iki yeni bağımlılık sınıfı giriyor:

- **Haber verisi:** Backend'de şu an hiçbir haber/sentiment kaynağı yok. Finnhub'ın `company-news` endpoint'inin mevcut abonelik planında dahil olup olmadığı doğrulanmamış — geliştirme başlamadan önce netleştirilmeli (bkz. Görev 1).
- **LLM sağlayıcı:** Hangi sağlayıcı/model kullanılacağı (maliyet, gecikme, Türkçe/İngilizce kalite) henüz seçilmedi — bu story'nin ilk teknik görevi bu seçimi netleştirmek.

**Neden grounding zorunlu:** Karar gerekçesi `docs/product-brief-epic9-ai.md`'de detaylandırıldı — özetle, haber verisi olmadan (salt LLM eğitim verisiyle) üretilen bir yorum hem güncelliğini kaybeder hem de halüsinasyon/"yatırım tavsiyesi" riski taşır. Bu yüzden AC'lerde haber bulunamazsa yorum **üretilmez**, "yeterli veri yok" gösterilir — sessiz/riskli bir fallback yok.

**BIST kapsamı:** Mevcut mimari kararla tutarlı olarak (Story 1.4'ten beri), BIST için canlı haber/temel veri kaynağı yok. Bu story kapsamında BIST için de "veri yok" uyarısı döner — ayrı bir BIST haber kaynağı bu story'nin kapsamı dışında.

## Kapsam

- **Backend:** Finnhub `company-news` entegrasyonu (yeni bir modül veya `fundamentals.py`'ye ek); LLM sağlayıcı entegrasyonu (RAG — haber başlıkları/özetleri + `fundamentals`/`score` verisi prompt'a enjekte edilir); `GET /fundamentals/ai-comment` (veya benzeri) uç noktası; premium erişim kontrolü (Epic 8 entitlement kontrolüyle aynı desen).
- **Web/Mobil:** Hisse detay sayfasında "AI Yorumu" bölümü (premium kilit durumu dahil).

**Kapsam dışı:**
- Tarama, portföy, ana ekran yerleşimleri (yalnızca hisse detay sayfası — bkz. `docs/product-brief-epic9-ai.md` §3).
- Sohbet/chat arayüzü (değerlendirildi, bu fazda seçilmedi).
- BIST için haber kaynağı entegrasyonu.

## Görevler

1. **[Karar/Mimari]** LLM sağlayıcı seçimi (maliyet/gecikme/dil kalitesi karşılaştırması) — `docs/architecture.md`'ye işlenmeli. ☐
2. **[Karar]** Finnhub mevcut plan seviyesinde `company-news` erişimi teyit edilmeli; yoksa plan yükseltme/alternatif kaynak kararı. ☐
3. **[Backend]** Haber çekme + RAG prompt oluşturma modülü. ☐
4. **[Backend]** `GET /fundamentals/ai-comment` (ya da eşdeğeri) uç noktası: premium kontrolü, haber yoksa "yeterli veri yok", BIST için uyarı. ☐
5. **[Backend]** Testler: haber var/yok senaryoları, premium/ücretsiz erişim kontrolü, BIST uyarı davranışı, LLM çağrısı hata durumu (sessiz hata yerine "şu an üretilemiyor"). ☐
6. **[Web]** Hisse detay sayfasına "AI Yorumu" bölümü + premium kilit UI'ı. ☐
7. **[Mobil]** Aynı bölüm, mobil bileşen deseniyle (`FundamentalsPanel.tsx` yanına veya ayrı bileşen). ☐

## Kabul Kriterleri

**AC1 — Yorum üretimi**
- **Given** premium bir kullanıcı bir hisse detay sayfasını açar, **When** "AI Yorumu" bölümüne gelirse, **Then** Finnhub `company-news` verisi ve uygulamanın kendi temel/teknik verileri zemine alınarak üretilmiş serbest formatlı bir yorum gösterilir (FR-100).

**AC2 — Premium kilidi**
- **Given** ücretsiz katmandaki bir kullanıcı, **When** aynı bölüme gelirse, **Then** özellik kilitli gösterilir ve premium yükseltme teklifiyle karşılaşır (FR-080).

**AC3 — Veri yoksa üretilmez**
- **Given** ilgili hisse için güncel haber bulunamazsa, **When** yorum üretilmeye çalışılırsa, **Then** "yeterli güncel veri yok" durumu gösterilir; haber olmadan bir yorum üretilmez.

**AC4 — Şeffaflık ve sorumluluk reddi**
- **And** yorumun altında sabit olarak "yatırım tavsiyesi değildir" ibaresi ve haber kaynağı/tarih bilgisi yer alır (NFR-3, NFR-7).

## Definition of Done

- [ ] AC1–AC4 karşılanıyor ve doğrulandı.
- [ ] LLM sağlayıcı seçimi ve maliyet tahmini `docs/architecture.md`'ye işlendi.
- [ ] Finnhub `company-news` erişimi teyit edildi (plan yeterli veya yükseltildi).
- [ ] Backend testleri yeşil + ruff temiz.
- [ ] Web: typecheck, lint, build yeşil.
- [ ] Mobil: typecheck, lint, Metro bundle yeşil.
- [ ] Regülasyon riski (bkz. `docs/product-brief-epic9-ai.md` §"Yatırımcı Sunumundan Önce Kapatılması Gereken Risk") için hukuki teyit alındı.
- [ ] Gerçek tarayıcıda/cihazda görsel-etkileşim doğrulaması yapıldı.

## Teknik Notlar

- **Maliyet kontrolü:** Yorumlar istek-anında değil, kısa bir TTL ile önbelleğe alınmalı (örn. saatlik) — aynı hisseye art arda gelen istekler her seferinde LLM çağrısı tetiklememeli. Story 4.1'deki işlem-içi TTL önbellek deseni (`_fundamentals_cache`) örnek alınabilir.
- **Prompt/veri sızıntısı riski:** Prompt'a yalnızca haber başlığı/özeti + uygulamanın kendi hesapladığı sayısal veriler enjekte edilmeli; kullanıcıya özel veri (portföy, not) bu story kapsamında prompt'a dahil edilmez.
- **Hata davranışı:** LLM sağlayıcı hatası/timeout durumunda sessiz hata yerine mevcut desenle tutarlı ("veri şu an güncellenemiyor" tarzı) bir uyarı gösterilmeli (NFR-2).
