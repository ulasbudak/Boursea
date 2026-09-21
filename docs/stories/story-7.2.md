---
title: "Story 7.2: Hisseye Kişisel Not Ekleme"
epic: "Epic 7 — Kişiselleştirme"
story_id: "7.2"
status: done
created: 2026-09-18
updated: 2026-09-18
author: Bob (BMAD Scrum Master) & Amelia (BMAD Developer)
based_on: ["docs/PRD.md", "docs/architecture.md §7", "docs/epics.md §11"]
depends_on: ["1.5"]
---

# Story 7.2: Hisseye Kişisel Not Ekleme

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want izlediğim bir hisseye kendi notumu eklemek,
So that o hisseyle ilgili düşüncelerimi/kararlarımı hatırlayabileyim.

*(Kaynak: `docs/epics.md` §11, Epic 7 — Story 7.2; PRD FR-062.)*

## Bağlam

Story 7.1'in aksine, bir not `user_metadata`'ya sığmıyor (kullanıcı başına *büyüyen bir liste*, her hisse için ayrı bir kayıt) — bu yüzden Story 5.1/5.2/6.1'deki gibi gerçek bir tablo (`stock_notes`) gerekti. Bir kullanıcının bir hissede **en fazla bir** notu olabilir (`unique (user_id, symbol, exchange)`), bu yüzden CRUD yerine tek bir **upsert** (`ON CONFLICT ... DO UPDATE`) yeterli — watchlist/portfolio'daki gibi ayrı create/update uç noktalarına gerek kalmadı.

## Kapsam

**Bu PR'da tamamlanan (Story 7.1 ile aynı PR/commit'te):**
- **DB:** `apps/api/migrations/0007_personalization.sql` — `stock_notes` tablosu (canlı Supabase'e uygulandı).
- **Backend:** `app/notes.py` (`get_note`/`upsert_note`/`delete_note`), `GET/PUT/DELETE /notes` (sembol+borsa query/body parametreli, liste değil tekil kaynak).
- **Web:** Hisse detay sayfasında `StockNoteCard` — metin alanı + kaydet/sil, "Kaydedildi" anlık geri bildirimi.
- **Mobil:** `StockOverviewScreen`'de aynı `StockNoteCard`.

**Kapsam dışı:**
- Not geçmişi/versiyonlama — yalnızca güncel not saklanıyor, üzerine yazılıyor.
- Notların izleme listesi/portföy gibi bir "tüm notlarım" listesi — yalnızca ilgili hisse sayfasında görünüyor.

## Görevler

1. **[DB]** `stock_notes` şeması + migration (`user_id`+`symbol`+`exchange` unique, RLS "varsayılan kapalı"). ✅
2. **[Backend]** `app/notes.py`: `get_note`/`upsert_note` (`ON CONFLICT DO UPDATE`)/`delete_note` (idempotent — olmayan notu silmek hata vermiyor). ✅
3. **[Backend]** `GET/PUT/DELETE /notes` uç noktaları; borsa doğrulaması (400), boş not reddi (400). ✅
4. **[Backend]** Testler: veri katmanı (fake psycopg connection) + uç nokta testleri (auth, 400, 503). ✅
5. **[Web]** `lib/notes-client.ts`; hisse detay sayfasında `StockNoteCard`. ✅
6. **[Mobil]** `lib/notes-client.ts`; `StockOverviewScreen`'de `StockNoteCard`. ✅

## Kabul Kriterleri

**AC1 — Not ekleme**
- **Given** bir hisse detay sayfası, **When** kullanıcı not alanına metin girip kaydederse, **Then** not kullanıcıya özel olarak saklanır (FR-062).

**AC2 — Not görüntüleme/düzenleme/silme**
- **Given** daha önce eklenmiş bir not, **When** kullanıcı sayfayı tekrar açarsa, **Then** notu görür ve düzenleyebilir/silebilir.

## Definition of Done

- [x] AC1–AC2 karşılanıyor ve doğrulandı (backend: pytest 246/246 yeşil + ruff temiz; web: typecheck/lint/build yeşil; mobil: typecheck/lint/Metro bundle yeşil).
- [x] Migration canlı Supabase'e uygulandı ve doğrulandı.
- [x] **Canlı uçtan uca doğrulandı:** `GET /notes` (yok → `null`) → `PUT /notes` (oluştur) → `GET /notes` (kalıcı olduğu doğrulandı) → `PUT /notes` (güncelle, `updated_at` değişti doğrulandı) → `DELETE /notes` (204) → `GET /notes` (tekrar `null`) → yetkisiz istek (401).
- [x] **Web görsel doğrulama** (2026-09-21) — Claude tarafından, headless Chromium (Playwright) ile: hisse detayındaki "Personal Note" alanına not yazılıp kaydedildi, "Saving…" durumu ve kaydedilen metnin kalıcı olarak göründüğü doğrulandı.
- [ ] Mobil doğrulama — bu ortamda gerçek simülatör/cihaz yok; kullanıcı bizzat denemeli.

## Teknik Notlar

- Story 5.1/6.1'deki tüm mimari kararlar (backend `postgres` rolüyle RLS bypass, `user_id` filtreleme, `authFetch`/`api-client.ts` deseni) burada da geçerli — yeni bir karar eklenmedi.
- `PUT /notes` hem oluşturma hem güncellemeyi kapsıyor (tek uç nokta, `ON CONFLICT DO UPDATE`) — watchlist/portfolio'daki ayrı `POST` (oluştur) + güncelleme mantığından farklı, çünkü burada "bir hissede en fazla bir not" kısıtı zaten upsert'i doğal kılıyor.
