---
title: "Story 5.4: Alarm Bildirimleri — Push ve E-posta"
epic: "Epic 5 — İzleme Listesi, Alarmlar ve Bildirimler"
story_id: "5.4"
status: done
created: 2026-09-16
updated: 2026-09-16
author: Bob (BMAD Scrum Master) & Amelia (BMAD Developer)
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md §9"]
language: tr
translationOf: null
englishVersion: docs/stories/story-5.4.en.md
depends_on: ["5.2", "5.3"]
---

# Story 5.4: Alarm Bildirimleri — Push ve E-posta

*English version: [`docs/stories/story-5.4.en.md`](story-5.4.en.md).*

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want bir alarm tetiklendiğinde push bildirimi ve/veya e-posta almak,
So that uygulamayı açık tutmadan haberdar olabileyim.

*(Kaynak: `docs/epics.md` §9, Epic 5 — Story 5.4; PRD FR-043, FR-070.)*

## Bağlam

Story 5.2/5.3, alarm tetiklenme durumunu yalnızca kullanıcı `/alerts` veya `/signal-alerts` sayfasını **açtığında** güncelliyordu (istek-anında değerlendirme, Celery/arka plan işi yok — bkz. Story 5.2'nin mimari gerekçesi). Bu story, tam da o değerlendirme anını **bildirim gönderme anı** olarak kullanır: bir alarm `active`'den `triggered`'a geçtiği anda (yani `evaluate_and_persist` içinde), aynı istek içinde bir push/e-posta bildirimi de gönderilir.

**Bunun anlamı ve dürüst bir sınır:** Kullanıcı uygulamayı hiç açmazsa (ne web ne mobil, ne de arka planda bir istek atmazsa), tetiklenme hiçbir zaman değerlendirilmez, dolayısıyla bildirim de gönderilmez — çünkü ortada gerçek bir arka plan zamanlayıcı/worker yok (bu, PRD'nin mimari kısıtları ve Story 5.2'de zaten kaydedilen bir sınırlama). Bu story, "kullanıcı bir şekilde tetikleyici bir istek attığında anında bildirim al" senaryosunu çözer; "uygulama hiç açılmasa bile arka planda sürekli izle" senaryosu Celery/cron gerektirir ve mimarinin "az hareketli parça" ilkesiyle çelişir — kapsam dışı bırakıldı, gelecekte gerekirse ayrı bir mimari kararla ele alınmalı.

**Yeni bir tasarım kararı (Story 1.3'ten sapma, gerekçeli):** Story 1.3 dil tercihini Supabase `user_metadata` üzerinden çözmüştü (JWT claim'i olarak taşınır). Bu story için push token/bildirim tercihi **yeni bir Postgres tablosunda** (`user_notification_settings`) tutuluyor, `user_metadata` **kullanılmıyor**. Sebep: `user_metadata`, JWT'nin **basıldığı andaki** bir anlık görüntüdür (genellikle ~1 saat taze); bir kullanıcı push izni verip token'ını kaydettiğinde, backend bunu ancak kullanıcının JWT'si yenilenince görebilir — bu, "az önce izin verdim ama backend hâlâ eski token'ı görüyor" gibi kafa karıştırıcı bir gecikmeye yol açar. Doğrudan Postgres'e (AD-3 ile tutarlı, Story 5.1/5.2/5.3'teki aynı desen) okuma/yazma bu gecikmeyi tamamen ortadan kaldırıyor.

## Kapsam

**Bu PR'da tamamlanan:**
- **DB:** `apps/api/migrations/0004_notification_settings.sql` — `user_notification_settings` tablosu (canlı Supabase'e uygulandı).
- **Backend:** `app/notifications.py` (ayar CRUD + Expo push gönderimi + Resend e-posta gönderimi + `notify_trigger` — hataya dayanıklı, asla ana isteği bozmaz), `app/alerts.py` ve `app/signal_alerts.py`'nin `evaluate_and_persist` fonksiyonlarına `user_id`/`email` parametreleri eklenip tetiklenme anında `notify_trigger` çağrısı bağlandı, `/notification-settings` (GET/PUT) uç noktaları.
- **Web:** `/settings` sayfasına "Bildirimler" kartı (yalnızca e-posta açma/kapama — push FR-043'e göre zaten mobil-özel).
- **Mobil:** `SettingsScreen`'e e-posta + push açma/kapama; push için `expo-notifications` ile izin isteme ve token kaydı (`lib/push-notifications.ts`).
- **i18n:** `Messages.settings` içine bildirim tercihi metinleri (tr/en).

**Kapsam dışı (bilinçli, gerekçeli):**
- **Mobilde gerçek bir push bildirimi gönderip cihazda görmek** — Expo SDK 53+ itibarıyla **Expo Go'da uzak (remote) push bildirimleri artık çalışmıyor**; bir **development build** (`expo-dev-client`/EAS) ve projenin `eas init` ile bir EAS projesine bağlanmış olması (`app.json`'da `expo.extra.eas.projectId`) gerekiyor — bu depo henüz o kurulumdan geçmedi. Bu, Story 1.2'deki native Google/Apple OAuth kısıtıyla **aynı kategoriden** bir sınırlama. Kod, güncel Expo dokümantasyonuna göre doğru yazıldı (`registerForPushNotificationsAsync` — izin iste, kanal oluştur, token al) ve Metro bundle'da hatasız derleniyor, ama gerçek bir token alıp cihaza bildirim ulaştırma bu ortamda test edilemedi.
- Sürekli arka plan izleme (kullanıcı hiç istek atmasa bile tetiklenmeyi tespit etme) — yukarıda gerekçelendirildi, Celery/cron gerektirir.
- Bildirim geçmişi/gelen kutusu (yalnızca anlık gönderim var, geçmiş bildirimlerin listelendiği bir ekran yok).

## Görevler

1. **[DB]** `user_notification_settings` şeması + migration (Story 5.1-5.3 deseniyle aynı). ✅
2. **[Backend]** `app/notifications.py`: ayar veri katmanı (get/upsert) + `send_expo_push` + `send_email` (Resend, `RESEND_API_KEY` yoksa nazikçe `False` döner) + `notify_trigger` (hataya dayanıklı sarmalayıcı). ✅
3. **[Backend]** `app/alerts.py` ve `app/signal_alerts.py`'nin `evaluate_and_persist`'ine `user_id`/`email` parametresi eklendi; `main.py`'deki `GET /alerts` ve `GET /signal-alerts` bu parametreleri `claims`'ten geçiriyor. ✅
4. **[Backend]** `/notification-settings` GET/PUT uç noktaları; CORS'a `PUT` eklendi. ✅
5. **[Backend]** Testler: ayar CRUD, `send_expo_push`/`send_email` (mock'lanmış HTTP), `notify_trigger` (asla hata fırlatmadığı dahil), uç nokta testleri. ✅
6. **[Web]** `lib/notification-settings-client.ts`; `/settings` sayfasına e-posta bildirim kartı. ✅
7. **[Mobil]** `expo-notifications`/`expo-device`/`expo-constants` kuruldu; `lib/push-notifications.ts`, `lib/notification-settings-client.ts`; `SettingsScreen`'e push+e-posta kartı. ✅
8. **[Hepsi]** `Messages.settings` içine bildirim metinleri (tr/en); `apps/api/.env.example`'a `RESEND_API_KEY`/`NOTIFICATION_FROM_EMAIL`. ✅

## Kabul Kriterleri

**AC1 — Push bildirimi (kod seviyesinde doğrulandı, cihazda değil)**
- **Given** bir kullanıcı mobil uygulamada push izni verip bir Expo push token'ı kayıtlıysa, **When** bir alarmı tetiklenirse, **Then** backend o token'a bir Expo push isteği gönderir (FR-043, FR-070). *(Gerçek cihaza teslimat, yukarıdaki Expo Go/EAS kısıtı nedeniyle bu ortamda doğrulanamadı; canlı testte gerçek bir istek atıldığı ve yanıtın hataya dayanıklı şekilde işlendiği doğrulandı.)*

**AC2 — E-posta bildirimi**
- **Given** kullanıcı e-posta bildirimini açık bırakmışsa, **When** bir alarm tetiklenirse, **Then** Resend üzerinden bir e-posta gönderilmeye çalışılır (`RESEND_API_KEY` yoksa nazikçe atlanır, hata fırlatılmaz).

**AC3 — Bildirim tercihleri**
- **And** kullanıcı push/e-posta tercihlerini ayarlar ekranından (web: yalnızca e-posta; mobil: her ikisi) açıp kapatabilir; tercih `user_notification_settings` tablosunda kalıcı olarak saklanır.

## Definition of Done

- [x] AC1–AC3 karşılanıyor ve doğrulandı (backend: pytest 174/174 yeşil + ruff temiz; web: typecheck/lint/build; mobil: typecheck/lint + Metro bundle [919 modül] yeşil).
- [x] Migration canlı Supabase'e uygulandı, doğrulandı.
- [x] `RESEND_API_KEY` olmadan da hiçbir uç nokta çökmüyor — e-posta sessizce atlanır.
- [x] **Canlı uçtan uca doğrulandı (push gönderim isteği seviyesinde):** Gerçek bir kullanıcı JWT'siyle `PUT /notification-settings` (sahte bir Expo token kaydı) → `POST /alerts` (anında tetiklenecek eşik) → `GET /alerts` (tetiklendi + arka planda bir Expo push isteği denendi, hata fırlatılmadan yutuldu, ana yanıt 200 döndü) → temizlik.
- [ ] Gerçek bir cihazda push bildirimi alma — yukarıda gerekçelendirilen EAS/dev-client kısıtı nedeniyle bu ortamda mümkün değil; kullanıcı `eas init` yapıp bir development build oluşturduktan sonra denemeli.

## Teknik Notlar

- **`user_metadata` yerine yeni tablo (yukarıda gerekçelendirildi):** Bu, Story 1.3'ün desenini bilinçli olarak takip etmiyor — tazelik gereksinimi farklı olduğu için.
- Expo push endpoint'i (`https://exp.host/--/api/v2/push/send`) bir API anahtarı gerektirmiyor; yalnızca alıcının push token'ını istiyor — bu yüzden `FINNHUB_API_KEY`/`RESEND_API_KEY` gibi bir "yoksa nazikçe atla" deseni push tarafında gerekmiyor, yalnızca token'ın var olup olmadığı kontrol ediliyor.
- `notify_trigger`, `evaluate_and_persist` içinde çağrılıyor ve **hiçbir zaman exception fırlatmıyor** — bir bildirim gönderim hatası, zaten veritabanına `triggered` olarak işlenmiş bir alarmın API yanıtını asla bozmamalı.
- Mobilde push token kaydı, `getExpoPushTokenAsync`'in gerektirdiği `projectId`'nin (`app.json` → `expo.extra.eas.projectId`) bu depoda henüz ayarlanmamış olması nedeniyle şu an `null` dönecek — bu, `eas init` çalıştırılana kadar beklenen bir davranıştır, bir hata değildir.
