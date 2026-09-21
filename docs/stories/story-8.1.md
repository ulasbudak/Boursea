---
title: "Story 8.1: Ücretsiz/Premium Katman Ayrımının Uygulanması"
epic: "Epic 8 — Abonelik ve Monetizasyon (Freemium)"
story_id: "8.1"
status: done
created: 2026-09-18
updated: 2026-09-18
author: Bob (BMAD Scrum Master) & Amelia (BMAD Developer)
based_on: ["docs/PRD.md", "docs/architecture.md §7", "docs/epics.md §12"]
depends_on: ["5.1", "5.2", "5.4", "6.1", "6.3"]
---

# Story 8.1: Ücretsiz/Premium Katman Ayrımının Uygulanması

## Kullanıcı Hikayesi

As a **ücretsiz kullanıcı**,
I want hangi özelliklerin ücretsiz hangilerinin premium olduğunu net şekilde görmek,
So that yükseltme yapmadan önce ne kazanacağımı bileyim.

*(Kaynak: `docs/epics.md` §12, Epic 8 — Story 8.1; PRD FR-080, FR-081, FR-082.)*

## Bağlam

Kullanıcı, Epic 8'in iki story'sinden yalnızca 8.1'in şimdi kurulmasını istedi (AskUserQuestion ile açıkça seçildi): Story 8.2 (RevenueCat/Stripe ile gerçek satın alma akışı) gerçek bir ödeme sağlayıcı hesabı (Apple Developer, RevenueCat, Stripe) gerektiriyor ve bu, kullanıcının kendisinin kuracağı bir iş/erişim kararı. Bu story yalnızca **entitlement altyapısını** kurar: backend'in önbelleğe aldığı bir `tier` alanından çözülen, istemcinin kendi kendine "premium'um" diyemediği bir erişim kontrolü (AD-7).

Satın alma akışı olmadığı için şu an sistemde premium'a **yükseltme yolu yok** — `entitlements` tablosunda satır yoksa kullanıcı otomatik `free`, ve bu satırı `premium` yapacak bir yazma yolu (Story 8.2'nin RevenueCat webhook'u) henüz mevcut değil. Bu bilinçli bir ara durum.

## Kapsam

**Bu PR'da tamamlanan:**
- **DB:** `apps/api/migrations/0008_entitlements.sql` — `entitlements` tablosu (`user_id` PK, `tier` `free`/`premium`, varsayılan `free`). Canlı Supabase'e uygulandı.
- **Backend:** `app/entitlements.py` — `get_tier()`/`get_entitlement()` + dört `enforce_*_limit()` fonksiyonu (izleme listesi öğesi, fiyat alarmı, sinyal alarmı, portföy sayısı), aşımda `EntitlementLimitError` fırlatıyor. `main.py`'de dört oluşturma uç noktasına (`POST /watchlists/{id}/items`, `POST /alerts`, `POST /signal-alerts`, `POST /portfolios`) enforcement bağlandı (aşımda 403). Yeni `GET /entitlements` uç noktası.
- **Web/Mobil:** `entitlements-client.ts` (her iki platformda) + `/entitlements`'ı okuyup gösteren bir "Planım" kartı (`/settings` sayfası web'de, `SettingsScreen` mobilde) — katman rozeti, dört limit satırı, gelişmiş indikatör/gerçek-zamanlı veri kilit durumu, devre dışı "Yükselt" butonu + "yakında" notu.
- **Web/Mobil:** Hisse detay sayfasında ücretsiz katman için veri gecikmesi uyarı metni (`DataDelayDisclosure` bileşeni web'de, `StockOverviewScreen`'e satır içi mobilde) — `advanced_indicators`/`realtime_data` alanlarına göre koşullu.
- **Web/Mobil:** Fiyat grafiğinin "Gelişmiş" indikatör bölümü, ücretsiz katman için arama/ekleme arayüzü yerine kilit mesajı gösteriyor (`price-chart.tsx` web'de, `PriceChartWebView.tsx` mobilde).
- **i18n:** `packages/shared/src/i18n/` içine yeni `billing` namespace'i (tr/en).
- **Hata mesajları:** Watchlist/alert/signal-alert `addItem`/`create` istemci fonksiyonları artık backend'in 403 `detail` mesajını (`"Ücretsiz katmanda en fazla N ... Sınırsız için premium'a geç."`) olduğu gibi kullanıcıya gösteriyor (önceden jenerik "Failed to..." hatası gösteriyordu) — hem web hem mobil, ilgili buton bileşenlerinde `error` state + render eklendi.

**Kapsam dışı (bilinçli):**
- Story 8.2 (gerçek satın alma/RevenueCat/Stripe) — kullanıcı tarafından ayrı bırakıldı, ödeme sağlayıcı hesapları kurulduktan sonra ele alınacak.
- `GET /compare` uç noktasının katman bazlı sınırlandırılması — bu uç nokta şu an kimlik doğrulamasız (public); bir tier kontrolü eklemek auth zorunluluğu getirip davranış değişikliğine yol açacaktı, bu story'nin kapsamının dışında tutuldu.
- Premium'a yükseltme akışı (buton işlevsel değil, yalnızca "yakında" notu) — Story 8.2'yi bekliyor.

## Görevler

1. **[DB]** `entitlements` şeması + migration (varsayılan `free`, RLS "varsayılan kapalı"). ✅
2. **[Backend]** `app/entitlements.py`: `get_tier`/`get_entitlement`/dört `enforce_*_limit` fonksiyonu; premium kullanıcılar için limit sorgusu hiç çalıştırılmıyor (erken dönüş). ✅
3. **[Backend]** `main.py`'ye dört enforcement çağrısı + `GET /entitlements` uç noktası; `EntitlementLimitError` → HTTP 403. ✅
4. **[Backend]** Testler: `test_entitlements.py` (16 test — tier/entitlement şekli, dört enforce fonksiyonu, uç nokta testleri) + var olan 4 testin yeni enforcement'ı mock'laması. ✅
5. **[Web]** `entitlements-client.ts`, `billing-card.tsx` (`/settings`), `data-delay-disclosure.tsx` (hisse detay), `price-chart.tsx`'e gelişmiş indikatör kilidi. ✅
6. **[Mobil]** `entitlements-client.ts`, `SettingsScreen`'e "Planım" kartı, `StockOverviewScreen`'e veri gecikmesi uyarısı, `PriceChartWebView.tsx`'e gelişmiş indikatör kilidi. ✅
7. **[Web/Mobil]** 403 entitlement hatalarının kullanıcıya gösterilmesi (watchlist/alert/signal-alert istemci + buton bileşenleri). ✅

## Kabul Kriterleri

**AC1 — Kilitli özellik + yükseltme teklifi**
- **Given** ücretsiz katmandaki bir kullanıcı, **When** premium bir özelliğe (gerçek zamanlı veri, geniş indikatör kütüphanesi, sınırsız tarama/alarm) erişmeye çalışırsa, **Then** özellik kilitli gösterilir ve yükseltme teklifiyle karşılaşır (FR-080, FR-081, FR-082).
  - Gelişmiş indikatörler: kilit mesajı gösteriliyor, arama/ekleme arayüzü render edilmiyor.
  - İzleme listesi/alarm/portföy limitleri: backend 403 + Türkçe "Sınırsız için premium'a geç" mesajı, istemci arayüzünde gösteriliyor.
  - `/settings` sayfasındaki "Planım" kartı, ücretsiz katmanda devre dışı "Yükselt" butonu + "yakında" notuyla teklif sunuyor.

**AC2 — Veri gecikmesi açıklaması**
- **Given** ücretsiz katman, **When** kullanıcı fiyat verisine bakarsa, **Then** verinin gecikmeli/günlük olduğu açıkça belirtilir.
  - Hisse detay sayfasında (web ve mobil), `realtime_data: false` olduğunda görünen bir uyarı metni eklendi.

**AC3 — Backend-çözümlü erişim kontrolü**
- **And** erişim kontrolü her zaman backend'in önbelleğe aldığı entitlement durumundan çözülür, istemci kendi kendine "premium'um" diyemez (AD-7).
  - Tüm limit kontrolleri (`enforce_*_limit`) backend'de, `entitlements` tablosundan okunan `tier`'a göre yapılıyor; istemci yalnızca `GET /entitlements`'ın döndürdüğü değeri gösteriyor, kendi state'ini otorite olarak kullanmıyor.

## Definition of Done

- [x] AC1–AC3 karşılanıyor ve doğrulandı (backend: pytest 262/262 yeşil + ruff temiz; web: typecheck/lint/build yeşil; mobil: typecheck/lint/Metro bundle yeşil).
- [x] Migration canlı Supabase'e uygulandı.
- [x] **Canlı uçtan uca doğrulandı:** Taze bir Supabase kullanıcısıyla `GET /entitlements` (varsayılan `free`, doğru limitler) → 3 fiyat alarmı oluşturma (`201` × 3) → 4. alarm `403` + doğru Türkçe mesaj. Test verisi sonrasında temizlendi.
- [x] **Web görsel doğrulama** (2026-09-21) — Claude tarafından, headless Chromium (Playwright) ile: `/settings`'teki "My Plan" kartı gerçek bir premium kullanıcıyla açıldı, tüm limitlerin (izleme listesi, alarm, sinyal alarmı, portföy: Unlimited; gelişmiş indikatör, gerçek zamanlı veri, AI raporları: Unlocked) doğru göründüğü doğrulandı.
- [ ] Mobil doğrulama — bu ortamda gerçek simülatör/cihaz yok; kullanıcı bizzat denemeli.

## Teknik Notlar

- Entitlement enforcement, domain modüllerinin (`watchlists.py`, `alerts.py`, `signal_alerts.py`, `portfolios.py`) içine değil, bilinçli olarak `main.py`'deki uç nokta katmanına yerleştirildi — bu modüller faturalama kavramından habersiz kalıyor, ayrım net.
- `entitlements` tablosunda satır olmaması = `free` katman (satır yoksa `get_tier()` `"free"` döndürür); Story 8.2 gelene kadar `premium` yazan bir yol yok, bu yüzden premium test etmek şu an yalnızca DB'ye elle satır ekleyerek mümkün (test ortamında yapıldı, canlıda yapılmadı).
- Premium kullanıcılar için `enforce_*_limit` fonksiyonları ilgili `list_*` fonksiyonunu (watchlist/alert/portfolio listesini veritabanından çekme) hiç çağırmıyor — erken dönüşle gereksiz DB sorgusu engelleniyor.
- Web ve mobilde gelişmiş indikatör kilidi tamamen istemci tarafı: `/entitlements`'ın `advanced_indicators` alanı okunuyor, ayrı bir backend uç noktası/enforcement yok (indikatör hesaplama zaten istemci tarafı, saf TS — Story 3.2/3.3).
