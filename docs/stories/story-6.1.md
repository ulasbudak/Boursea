---
title: "Story 6.1: Portföy Oluşturma ve Pozisyon Ekleme"
epic: "Epic 6 — Portföy Takibi"
story_id: "6.1"
status: done
created: 2026-09-18
updated: 2026-09-18
author: Bob (BMAD Scrum Master) & Amelia (BMAD Developer)
based_on: ["docs/PRD.md", "docs/architecture.md §7", "docs/epics.md §10"]
depends_on: ["5.1"]
---

# Story 6.1: Portföy Oluşturma ve Pozisyon Ekleme

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want sahip olduğum hisseleri adet ve maliyet fiyatıyla portföyüme eklemek,
So that gerçek yatırımlarımı uygulama üzerinden takip edebileyim.

*(Kaynak: `docs/epics.md` §10, Epic 6 — Story 6.1; PRD FR-050.)*

## Bağlam

Story 5.1'in kimlik doğrulamalı yazma deseni (`Authorization: Bearer`, `user_id` filtreli sorgular, RLS "varsayılan kapalı" savunma katmanı) burada aynen tekrar kullanılıyor — yeni bir tablo çifti (`portfolios` → `positions`), yeni bir backend modülü (`app/portfolios.py`), yeni bir `/portfolios` uç nokta seti.

**Yeni bir muhasebe kararı — ağırlıklı ortalama maliyet:** "ek alım/satım girerse ortalama maliyet yeniden hesaplanır" AC'si, standart borsa/brokerage muhasebesiyle uygulandı: bir **alış (buy)** işlemi mevcut pozisyona ağırlıklı ortalama ile eklenir (`yeni_ort_maliyet = (eski_adet×eski_ort_maliyet + yeni_adet×işlem_fiyatı) / toplam_adet`); bir **satış (sell)** işlemi yalnızca adedi azaltır, ortalama maliyet değişmez (gerçekleşen kâr/zarar bu story'nin kapsamında ayrıca hesaplanmıyor). Elde tutulandan fazla satış `InsufficientQuantityError` → 400 ile reddedilir. Tam satış pozisyonu siler.

Story 6.2 (değerleme) ve 6.3 (çoklu portföy), bu story ile **aynı PR'da** birlikte uygulandı — şema zaten `portfolio_id` FK ile çoklu-portföyü baştan destekliyor (Story 5.1'in çoklu-liste deseniyle birebir aynı), ve tek bir pozisyon modelinde canlı değerleme eklemek ayrı bir story olarak bölünmeye değecek kadar büyük değildi.

## Kapsam

**Bu PR'da tamamlanan:**
- **DB:** `apps/api/migrations/0006_portfolios.sql` — `portfolios` + `positions` tabloları (canlı Supabase projesine uygulandı).
- **Backend:** `app/portfolios.py` (CRUD + `add_transaction` ağırlıklı-ortalama mantığı), `main.py`'de `/portfolios` uç noktaları (GET liste+değerleme, POST oluştur, DELETE sil, POST/DELETE pozisyon).
- **Web:** `/portfolio` sayfası (liste + satır-içi işlem formu), dashboard nav kartı.
- **Mobil:** `PortfolioScreen.tsx`, `HomeScreen` nav girişi.
- **i18n:** `Messages.portfolio` bölümü (tr/en).

**Kapsam dışı (takip görevleri):**
- Hisse detay sayfasından hızlı "portföye ekle" kısayolu (watchlist/alerts'te olduğu gibi) — şu an yalnızca `/portfolio` sayfasından işlem eklenebiliyor; sembol/borsa/ad elle giriliyor.
- Pozisyon düzenleme/işlem geçmişi görüntüleme — yalnızca güncel adet/ortalama maliyet saklanıyor, geçmiş alım/satım işlemlerinin kendisi ayrı kayıt altına alınmıyor (ledger yok, yalnızca pozisyon-seviyesi state).
- Gerçekleşen kâr/zarar (satıştan doğan) hesaplaması — yalnızca gerçekleşmemiş (unrealized) kâr/zarar hesaplanıyor.

## Görevler

1. **[DB]** `portfolios`/`positions` şeması + migration (Story 5.1 deseniyle aynı: `user_id`/`portfolio_id` FK, RLS "varsayılan kapalı"). ✅
2. **[Backend]** `app/portfolios.py`: veri katmanı (list/create/delete portfolio) + `add_transaction` (ağırlıklı ortalama maliyet, satışta adet düşürme/pozisyon silme, yetersiz miktar kontrolü). ✅
3. **[Backend]** `/portfolios` REST uç noktaları; hata haritalama (404, 503, 400 — geçersiz borsa/taraf/adet/fiyat, yetersiz miktar). ✅
4. **[Backend]** Testler: veri katmanı (fake psycopg connection, Story 5.1 deseniyle aynı) + uç nokta testleri. ✅
5. **[Web]** `lib/portfolios-client.ts`; `/portfolio` sayfası (liste oluşturma + satır-içi işlem formu). ✅
6. **[Mobil]** `lib/portfolios-client.ts`; `PortfolioScreen.tsx` (aynı akış, `ToggleOption` ile borsa/taraf seçimi). ✅
7. **[Hepsi]** `Messages.portfolio` i18n bölümü (tr/en), dashboard/HomeScreen nav girişleri. ✅

## Kabul Kriterleri

**AC1 — Pozisyon ekleme**
- **Given** portföy ekranı, **When** kullanıcı bir hisse için adet ve maliyet fiyatı girerse, **Then** pozisyon portföyüne eklenir (FR-050).

**AC2 — Ortalama maliyet yeniden hesaplama**
- **Given** var olan bir pozisyon, **When** kullanıcı ek alım girerse, **Then** ortalama maliyet ağırlıklı ortalamayla yeniden hesaplanır; satış girerse adet azalır, ortalama maliyet sabit kalır.

**AC3 — Pozisyon silme**
- **And** kullanıcı bir pozisyonu doğrudan silebilir (adedi sıfıra indirmeden).

## Definition of Done

- [x] AC1–AC3 karşılanıyor ve doğrulandı (backend: pytest 227/227 yeşil + ruff temiz [yeni dosyalarda]; web: typecheck/lint/build yeşil; mobil: typecheck/lint/Metro bundle [766 modül] yeşil).
- [x] Migration canlı Supabase'e uygulandı ve doğrulandı.
- [x] **Canlı uçtan uca doğrulandı:** gerçek bir kullanıcı JWT'siyle tam akış — portföy oluştur → 10 AAPL @ 100 al → 10 AAPL daha @ 200 al (ortalama maliyet 100→150 doğrulandı) → 5 AAPL @ 999 sat (adet 20→15, ortalama maliyet 150'de sabit kaldı doğrulandı) → 100 AAPL satmaya çalış (400 doğrulandı) → pozisyon/portföy sil → temizlik.
- [x] **Web görsel-etkileşim doğrulaması** (2026-09-21) — Claude tarafından, headless Chromium (Playwright) ile: `/portfolio`'da yeni portföy oluşturma, AAPL için 5 adet @ $330 alım işlemi ekleme doğrulandı — gerçek anlık fiyatla (`$336.13`) toplam değer/kâr-zarar doğru hesaplandı ($1,680.65, +$30.65/+1.9%). Test verisi sonradan temizlendi.
- [ ] Mobil `PortfolioScreen` doğrulaması — bu ortamda gerçek simülatör/cihaz yok; kullanıcı bizzat denemeli.

## Teknik Notlar

- Story 5.1'deki tüm mimari kararlar (backend `postgres` rolüyle RLS bypass, `user_id` filtreleme, `authFetch`/`api-client.ts` deseni) burada da geçerli — yeni bir karar eklenmedi.
- Değerleme mantığı (canlı fiyat, kâr/zarar hesaplama) Story 6.2'de detaylandırılıyor — bu doküman yalnızca CRUD/muhasebe tarafını kapsıyor, ikisi aynı `app/portfolios.py` dosyasında birlikte yaşıyor.
