---
title: "Story 5.1: İzleme Listesi Oluşturma ve Yönetimi"
epic: "Epic 5 — İzleme Listesi, Alarmlar ve Bildirimler"
story_id: "5.1"
status: in-progress
created: 2026-09-15
updated: 2026-09-15
author: Bob (BMAD Scrum Master) & Amelia (BMAD Developer)
based_on: ["docs/PRD.md", "docs/architecture.md §7", "docs/epics.md §9"]
---

# Story 5.1: İzleme Listesi Oluşturma ve Yönetimi

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want takip etmek istediğim hisseleri bir veya birden fazla izleme listesine eklemek,
So that ilgilendiğim hisseleri tek yerden takip edebileyim.

*(Kaynak: `docs/epics.md` §9, Epic 5 — Story 5.1; PRD FR-040.)*

## Bağlam

Bu, projenin **ilk kalıcı, kullanıcıya özel yazma işlemi** — şimdiye kadarki tüm endpoint'ler ya salt-okunur piyasa verisiydi (Finnhub/Twelve Data'dan geçirilen) ya da kimlik doğrulaması gerektirmiyordu. Bu story ile birlikte:

- İlk kez gerçek bir veritabanı tablosu (`watchlists`, `watchlist_items`) oluşturuldu — proje `docs/architecture.md` §7'de bir "seed" şema önermişti, bu story onu ilk kez koda döktü.
- İlk kez frontend, backend'e **kimlik doğrulamalı** (`Authorization: Bearer <supabase-access-token>`) bir istek gönderiyor — önceki tüm frontend çağrıları anonimdi.
- Backend Supabase'e `postgres` rolüyle (RLS'i bypass eden) doğrudan bağlandığı için, kullanıcı izolasyonu **backend'in kendi sorgularında** (`WHERE user_id = %s`) sağlanıyor; RLS yalnızca "Data API hiç açılırsa dahi varsayılan olarak kapalı kalsın" diye savunma amaçlı etkinleştirildi.

## Kapsam

**Bu PR'da tamamlanan:**
- **DB:** `apps/api/migrations/0001_watchlists.sql` — `watchlists` + `watchlist_items` tabloları (canlı Supabase projesine uygulandı).
- **Backend:** `app/watchlists.py` (CRUD veri katmanı), `main.py`'de `/watchlists` uç noktaları (GET/POST/DELETE liste, POST/DELETE öğe), CORS'a POST/DELETE eklendi (önceden yalnızca GET izinliydi).
- **Web:** `/watchlist` sayfası (liste oluşturma/silme, öğe kaldırma), hisse detay sayfasında "İzleme Listesine Ekle" popover'ı (birden fazla listeye ekleyip çıkarabilme + satır içi yeni liste oluşturma), dashboard'a nav kartı, `lib/api-client.ts` (kimlik doğrulamalı fetch — bu desenin ilk kullanımı).

**Kapsam dışı (takip görevleri):**
- Story 5.2–5.4 (fiyat/indikatör alarmları, push/e-posta bildirimleri) — ayrı story'ler.
- Öğe başına not (`note` sütunu DB'de var ama düzenleme arayüzü yok).
- Bir hisseyi listeler arasında taşıma/kopyalama; liste yeniden adlandırma.
- Gerçek zamanlı fiyat/değişim gösterimi izleme listesi sayfasında (yalnızca sembol/ad/borsa gösteriliyor — her item için canlı quote çekmek ayrı bir performans/rate-limit kararı gerektirir).

## Görevler

1. **[DB]** `watchlists`/`watchlist_items` şeması + migration. ✅
2. **[Backend]** `app/watchlists.py` veri katmanı (list/create/delete watchlist, add/remove item), kullanıcı bazlı yetkilendirme (`user_id` filtresi). ✅
3. **[Backend]** `/watchlists` REST uç noktaları, hata haritalama (404 bulunamadı, 503 DB erişilemez, 400 geçersiz borsa/isim). ✅
4. **[Backend]** Testler: veri katmanı (fake psycopg connection) + uç nokta testleri (auth mock, 401/404/503/400 senaryoları). ✅
5. **[Web]** `lib/api-client.ts` + `lib/watchlists-client.ts` (kimlik doğrulamalı istemci). ✅
6. **[Web]** `/watchlist` sayfası, hisse detay sayfasında ekle/çıkar popover'ı, dashboard nav kartı. ✅
7. **[Mobil]** `lib/watchlists-client.ts`, `WatchlistScreen.tsx`, hisse detayında `AddToWatchlistButton.tsx` (modal ile çoklu liste ekle/çıkar), `HomeScreen`'e nav girişi. ✅
8. **[Backend]** Story 5.2–5.4 (alarmlar, bildirimler) — ayrı story'ler olarak planlanmalı. ☐

## Kabul Kriterleri

**AC1 — Listeye ekleme**
- **Given** bir hisse detay sayfası, **When** kullanıcı "İzleme Listesine Ekle" butonuna basıp bir liste seçerse, **Then** hisse o listeye eklenir (FR-040).

**AC2 — Çoklu liste**
- **Given** birden fazla izleme listesi, **When** kullanıcı yeni bir liste oluşturursa, **Then** listeye istediği ismi verebilir ve hisseleri buna dağıtabilir.

**AC3 — Kaldırma**
- **And** kullanıcı bir hisseyi izleme listesinden kaldırabilir (hem `/watchlist` sayfasından hem hisse detayındaki popover'dan).

## Definition of Done

- [x] Migration canlı Supabase'e uygulandı ve doğrulandı.
- [x] Backend testleri yeşil (135/135, watchlist için 18 yeni test) + ruff temiz.
- [x] Canlı smoke test: gerçek bir kullanıcı JWT'siyle tüm CRUD akışı (`POST /watchlists` → `POST .../items` → `GET /watchlists` → `DELETE .../items/{id}` → `DELETE /watchlists/{id}`) uçtan uca doğrulandı.
- [x] Web: typecheck, lint, `next build` yeşil.
- [x] Mobil: typecheck, lint, Metro bundle (695 modül) yeşil.
- [ ] Gerçek tarayıcıda/cihazda görsel-etkileşim doğrulaması — bu oturumda tarayıcı/simülatör otomasyon aracı yoktu; kullanıcı `/watchlist`, hisse detayındaki "ekle" akışını (web) ve mobil `WatchlistScreen`/`AddToWatchlistButton`'ı bizzat denemeli.

## Teknik Notlar

- **Kimlik doğrulama deseni (yeni):** İstemci `supabase.auth.getSession()` ile access token alıp `Authorization: Bearer` header'ı olarak backend'e gönderiyor (`apps/web/src/lib/api-client.ts`). Bu depodaki **ilk** kimlik doğrulamalı frontend→backend çağrısı — önceki tüm entegrasyonlar (screener, search, candles vb.) anonimdi.
- **CORS:** `app/main.py`'deki `CORSMiddleware` önceden yalnızca `GET` izin veriyordu; watchlist'in POST/DELETE ihtiyacı için `allow_methods` genişletildi.
- **Yetkilendirme modeli:** Backend Supabase'e Session Pooler üzerinden `postgres.<proje-ref>` kullanıcısıyla bağlanıyor — bu rol RLS'i bypass eder. Bu yüzden her sorgu backend kodunda elle `user_id` ile filtreleniyor (`app/watchlists.py`); RLS yalnızca Data API hiç etkinleştirilirse diye "varsayılan kapalı" savunma katmanı.
- **Denormalize `name`:** `watchlist_items.name` eklenirken (frontend zaten hisse adını biliyor — arama/detay sayfasından) saklanıyor; bu, izleme listesi sayfasını render ederken her item için ayrı bir Finnhub/Twelve Data çağrısı yapmayı (rate-limit riski) gerektirmiyor.
- **`react-hooks/set-state-in-effect` (web + mobil eslint config'inde etkin):** Bir `useEffect` içinde, effect'in DIŞINDA tanımlanmış bir fonksiyonu (`load()` gibi) çağırmak lint hatası veriyor; effect'in kendi içinde tanımlanıp aynı yerde çağrılan bir async fonksiyon (`async function initialLoad() {...}; initialLoad();`) gerekiyor. Bu depodaki mevcut veri-çekme effect'leri (`ScoreBadge`, `SignalList` vb.) zaten bu deseni kullanıyordu; yeni watchlist bileşenleri de buna uyduruldu.
