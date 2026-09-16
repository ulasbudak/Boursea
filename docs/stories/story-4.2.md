---
title: "Story 4.2: Kayıtlı Taramalar"
epic: "Epic 4 — Tarama (Screener) ve Karşılaştırma"
story_id: "4.2"
status: done
created: 2026-09-16
updated: 2026-09-16
author: Bob (BMAD Scrum Master) & Amelia (BMAD Developer)
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md §8"]
language: tr
translationOf: null
englishVersion: docs/stories/story-4.2.en.md
depends_on: ["4.1"]
---

# Story 4.2: Kayıtlı Taramalar

*English version: [`docs/stories/story-4.2.en.md`](story-4.2.en.md).*

## Kullanıcı Hikayesi

As a **aktif trader**,
I want tarama kriter setimi bir isimle kaydedip tekrar çalıştırabilmek,
So that her seferinde kriterleri yeniden girmek zorunda kalmayayım.

*(Kaynak: `docs/epics.md` §8, Epic 4 — Story 4.2; PRD FR-031.)*

## Bağlam

Story 4.1'in tarama formu (web'de 11 alan, mobilde 4 alan) her ziyarette sıfırdan doldurulmak zorundaydı. Bu story, kriter setini kullanıcı hesabına bağlı olarak saklayan basit bir CRUD katmanı ekliyor — Story 5.1'in izleme listesi (`watchlists`) ve Story 5.2/5.3'ün alarm modüllerinin izlediği aynı desen: Pydantic modeli + `_row_to_X` dönüştürücü + `list/create/update/delete` fonksiyonları + özel `NotFoundError`.

**Kriterlerin saklanma biçimi:** `ScreenerCriteria`'nın alanlarını ayrı sütunlara dökmek yerine, kriter seti tek bir `jsonb` sütununda (`criteria`) saklanıyor. Sebep: web ve mobil formları farklı sayıda/isimde kritere sahip (mobil, MVP kapsamında yalnızca 4 alan sunuyor); `jsonb` bu farkı şema değişikliği gerektirmeden karşılıyor, ve zaten `/screener/run` de kriterleri kendi tarafında ayrıştırıp doğruluyor — kayıtlı kriterin backend'de yeniden doğrulanması gerekmiyor, olduğu gibi geri yükleyip formu dolduruyor.

## Kapsam

**Bu PR'da tamamlanan:**
- **DB:** `apps/api/migrations/0005_saved_screens.sql` — `saved_screens` tablosu (`id, user_id, name, criteria jsonb, created_at`), canlı Supabase'e uygulandı.
- **Backend:** `app/saved_screens.py` (CRUD: `list_saved_screens`, `create_saved_screen`, `update_saved_screen`, `delete_saved_screen`, `SavedScreenNotFoundError`); `GET/POST/PUT/DELETE /saved-screens` uç noktaları (hepsi `get_current_claims` ile korunuyor).
- **Web:** `/screener` sayfasına "Kayıtlı Taramalar" kartı — isim girip kaydetme, listeden yükleme (formu doldurur), yeniden adlandırma (`window.prompt`), silme (`window.confirm`) — mevcut izleme listesi ekranının deseniyle tutarlı.
- **Mobil:** `ScreenerScreen.tsx`'e aynı işlevi gören bir kart — yeniden adlandırma, web'deki `window.prompt` yerine satır-içi düzenlenebilir bir `TextInput`'a dönüşüyor (React Native'de `Alert.prompt` yalnızca iOS'ta var, bu yüzden platformlar arası tutarlı bir çözüm tercih edildi); silme onay istemeden gerçekleşiyor — bu, mevcut `WatchlistScreen`'in silme davranışıyla birebir aynı (mobilde hiçbir ekranda `Alert.alert` onayı kullanılmıyor).
- **i18n:** `Messages.screener` içine kayıtlı tarama metinleri (tr/en) eklendi (ayrı bir alt nesne değil, düz alanlar olarak — mevcut `screener` bölümüyle aynı düzeyde).

**Kapsam dışı (bilinçli):**
- Kayıtlı bir taramanın otomatik olarak periyodik çalıştırılıp bildirim göndermesi — bu, Story 5.3'ün sinyal alarmlarıyla örtüşen ayrı bir özellik olurdu; kapsam dışı bırakıldı.
- Kayıtlı kriterlerin backend'de şema doğrulaması — `jsonb` olduğu gibi saklanır/döner, form kendi alan adlarını bildiği için sorun çıkarmaz.

## Görevler

1. **[DB]** `saved_screens` şeması + migration. ✅
2. **[Backend]** `app/saved_screens.py`: CRUD veri katmanı. ✅
3. **[Backend]** `/saved-screens` GET/POST/PUT/DELETE uç noktaları, kimlik doğrulamalı. ✅
4. **[Backend]** Testler: veri katmanı (liste/oluştur/güncelle/sil, bulunamadı durumları), uç nokta testleri (201/200/204/404/503/401). ✅
5. **[Web]** `lib/saved-screens-client.ts`; `/screener` sayfasına kayıt/yükle/yeniden adlandır/sil kartı. ✅
6. **[Mobil]** `lib/saved-screens-client.ts`; `ScreenerScreen.tsx`'e aynı kart (satır-içi yeniden adlandırma). ✅
7. **[Hepsi]** `Messages.screener` içine kayıtlı tarama metinleri (tr/en). ✅

## Kabul Kriterleri

**AC1 — Kaydetme**
- **Given** oluşturulmuş bir tarama, **When** kullanıcı "Kaydet" deyip bir isim girerse, **Then** kriter seti kullanıcı hesabına bağlı olarak saklanır (FR-031).

**AC2 — Geri yükleme**
- **Given** kayıtlı taramalar listesi, **When** kullanıcı birini seçerse, **Then** kriterler geri yüklenir; kullanıcı ardından "Taramayı çalıştır"a basarak güncel veriyle yeniden çalıştırır. *(Not: geri yükleme formu otomatik olarak yeniden çalıştırmaz — kullanıcı hangi kriterlerin yüklendiğini görüp isterse ayarladıktan sonra çalıştırır; bu, mevcut tarama akışıyla [form doldur → manuel çalıştır] tutarlıdır.)*

**AC3 — Silme ve yeniden adlandırma**
- **And** kullanıcı kayıtlı bir taramayı silebilir veya yeniden adlandırabilir.

## Definition of Done

- [x] AC1–AC3 karşılanıyor ve doğrulandı (backend: pytest 201/201 yeşil + ruff temiz; web: typecheck/lint/build yeşil; mobil: typecheck/lint + Metro bundle yeşil).
- [x] Migration canlı Supabase'e uygulandı, doğrulandı.
- [x] **Canlı uçtan uca doğrulandı:** Gerçek bir kullanıcı JWT'siyle `POST /saved-screens` (kriter seti kaydet) → `GET /saved-screens` (listede göründüğü doğrulandı) → `PUT /saved-screens/{id}` (yeniden adlandırma, kriterin değişmediği doğrulandı) → `DELETE /saved-screens/{id}` (silindiği doğrulandı) → kimlik doğrulamasız istek 401 döndüğü doğrulandı.

## Teknik Notlar

- `saved_screens.criteria` sütunu `jsonb` — `psycopg`'nin `Json()` sarmalayıcısı ile yazılıyor, okurken doğrudan `dict` olarak geliyor (ekstra `json.loads` gerekmiyor, `psycopg[binary]` bunu otomatik çözüyor).
- `update_saved_screen`, `name`/`criteria`'dan yalnızca gönderileni günceller (`COALESCE` ile) — kısmi güncelleme (yalnızca yeniden adlandırma) kriterleri sıfırlamaz.
- Web ve mobil, aynı `saved_screens` tablosunu farklı şekilli `criteria` nesneleriyle kullanıyor (web 11 alan, mobil 4 alan) — bu kasıtlı: bir platformda kaydedilen bir tarama diğer platformda yüklendiğinde, o platformun formu yalnızca kendi bildiği alanları doldurur, bilmediği alanlar sessizce yok sayılır (TypeScript'in `Partial<Criteria>` genişletmesi sayesinde).
