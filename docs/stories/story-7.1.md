---
title: "Story 7.1: İlgi Profili ve Öne Çıkanlar"
epic: "Epic 7 — Kişiselleştirme"
story_id: "7.1"
status: done
created: 2026-09-18
updated: 2026-09-18
author: Bob (BMAD Scrum Master) & Amelia (BMAD Developer)
based_on: ["docs/PRD.md", "docs/architecture.md §7", "docs/epics.md §11"]
depends_on: ["1.3", "4.1"]
---

# Story 7.1: İlgi Profili ve Öne Çıkanlar

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want ilgilendiğim sektör/hisseleri işaretlemek,
So that ana ekranda bana uygun öne çıkan hisseleri görebileyim.

*(Kaynak: `docs/epics.md` §11, Epic 7 — Story 7.1; PRD FR-061.)*

## Bağlam

**Yeni tablo yok — Story 1.3'ün kararı tekrarlandı:** Dil tercihi gibi, ilgi alanı sektörleri de basit, kullanıcı başına tek bir liste (çoklu satır ilişkisi yok) olduğu için Supabase Auth `user_metadata`'sında (`interest_sectors: string[]`) saklanıyor — yeni bir DB tablosu/migration gerekmedi. Kritik teknik detay: bu alan **doğrudan JWT claim'i olarak** backend'e ulaşıyor (`claims["user_metadata"]["interest_sectors"]`), bu yüzden backend'in ekstra bir Supabase API çağrısı yapmasına gerek yok — canlı bir testle doğrulandı (`user_metadata` içeriği decode edilen access token'da aynen mevcut).

**"Öne çıkanlar" kuralı:** Story 4.1'in screener'ıyla aynı iki-aşamalı desen — önce statik ABD evrenini (`us_universe.json`, aynı 118 sembol) seçili sektörlere göre filtrele (ücretsiz), sonra yalnızca o alt küme için canlı fiyat çek (Finnhub `get_us_overview`, screener'daki eşzamanlılık sınırıyla aynı). Kural: `abs(change_pct)` değerine göre azalan sırala, ilk 10'u göster — "en çok hareket edenler" (yükselen veya düşen fark etmez). BIST için canlı fiyat kaynağı olmadığından bu özellik ABD-only (screener'la tutarlı).

## Kapsam

**Bu PR'da tamamlanan:**
- **Backend:** `app/highlights.py` (`get_highlights(interest_sectors)` — sektör filtresi + canlı fiyat + sıralama), `GET /highlights` (kimlik doğrulamalı, sektörleri JWT'den okur).
- **Web:** `/settings` sayfasına "İlgi Alanlarım" kartı (11 sektör, çoklu seçim chip'leri, `supabase.auth.updateUser` ile anlık kaydediliyor); `/dashboard`'a "Öne Çıkanlar" bölümü.
- **Mobil:** `SettingsScreen`'e aynı sektör seçici; `HomeScreen`'e "Öne Çıkanlar" listesi.
- **Paylaşılan:** `packages/shared/src/i18n/sectors.ts` — `ALL_SECTORS` + `translateSector()` (İngilizce sektör kodlarını TR/EN görüntü etiketine çeviren tek kaynak).

**Kapsam dışı:**
- BIST hisseleri için öne çıkanlar — canlı BIST fiyat kaynağı yok.
- "Öne çıkanlar" listesinin özelleştirilebilir kuralları (örn. yalnızca yükselenler, hacim bazlı) — yalnızca "en çok hareket eden" tek kural var.

## Görevler

1. **[Backend]** `app/highlights.py`: sektör filtresi (statik evren üzerinde) + canlı fiyat + `abs(change_pct)` sıralaması, ilk 10 ile sınırlama. ✅
2. **[Backend]** `GET /highlights`: `claims["user_metadata"]["interest_sectors"]` okuma, ilgi alanı yoksa uyarı. ✅
3. **[Backend]** Testler: sektör filtreleme, sıralama, fiyatı alınamayan sembollerin hariç tutulması, sonuç sayısı sınırı, JWT claim okuma. ✅
4. **[Paylaşılan]** `packages/shared/src/i18n/sectors.ts`: `ALL_SECTORS`/`translateSector`. ✅
5. **[Web]** `/settings`'te sektör seçici (`setInterestSectors` server action); `/dashboard`'da "Öne Çıkanlar" bölümü. ✅
6. **[Mobil]** `SettingsScreen`'de aynı seçici; `HomeScreen`'de "Öne Çıkanlar" listesi. ✅

## Kabul Kriterleri

**AC1 — İlgi alanı kaydetme**
- **Given** profil ayarları, **When** kullanıcı ilgi alanı sektörlerini seçerse, **Then** tercih kaydedilir (FR-061).

**AC2 — Öne çıkanlar gösterimi**
- **Given** kayıtlı ilgi profili, **When** kullanıcı ana ekranı açarsa, **Then** seçilen sektörlerden kural bazlı olarak öne çıkan (en çok hareket eden) hisseler gösterilir.

## Definition of Done

- [x] AC1–AC2 karşılanıyor ve doğrulandı (backend: pytest 246/246 yeşil + ruff temiz; web: typecheck/lint/build yeşil; mobil: typecheck/lint/Metro bundle [771 modül] yeşil).
- [x] Migration gerekmedi (yeni tablo yok, bkz. Bağlam).
- [x] **Canlı uçtan uca doğrulandı:** `interest_sectors: ["Technology","Energy"]` ile kayıtlı bir kullanıcının JWT'sinde `user_metadata.interest_sectors` gerçekten mevcut olduğu doğrulandı; `GET /highlights` gerçek Finnhub verisiyle çağrıldı, gerçek "en çok hareket edenler" (INTC +7.67%, AMD +6.36%, MU +5.50%, ...) doğru sırada döndü (~1.6sn).
- [ ] Gerçek tarayıcıda/cihazda görsel doğrulama — kullanıcı bizzat denemeli.

## Teknik Notlar

- **`interest_sectors` güncellemesi backend'e hiç uğramıyor:** Web'de `supabase.auth.updateUser()` server action'dan, mobilde aynı çağrı client'tan doğrudan Supabase Auth'a gidiyor (Story 1.3'teki `locale` güncellemesiyle birebir aynı desen). Backend yalnızca **okuyor** (JWT claim'inden), hiç yazmıyor.
- Sektör değerleri (`Technology`, `Energy` vb.) Finnhub'ın taksonomisiyle birebir — `us_universe.json`'daki değerlerle aynı, API filtre parametresi olarak elle değiştirilmeden kullanılıyor; yalnızca **görüntü etiketi** `translateSector()` ile yerelleştiriliyor.
