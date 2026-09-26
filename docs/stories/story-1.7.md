---
title: "Story 1.7: Satır İçi Giriş Hataları, E-posta Onay Bildirimi ve Şifre Sıfırlama"
epic: "Epic 1 — Kimlik Doğrulama, Hisse Keşfi ve Temel Altyapı"
story_id: "1.7"
status: done
created: 2026-09-26
updated: 2026-09-26
author: Claude (geriye dönük dokümante edildi, 2026-09-26 — kod `5e29760` commit'inde yayımlandı)
based_on: ["docs/stories/story-1.2.md", "commit 5e29760"]
depends_on: ["1.2"]
---

# Story 1.7: Satır İçi Giriş Hataları, E-posta Onay Bildirimi ve Şifre Sıfırlama

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want giriş/kayıt hatalarını formun üzerinde anlaşılır bir dille görmek, kayıttan sonra e-postamı onaylamam gerektiğini öğrenmek ve şifremi unuttuğumda sıfırlayabilmek,
So that hesabıma erişemediğimde ne yapmam gerektiğini bilip destek istemeden kendi başıma çözebileyim.

## Bağlam

**Bu doküman geriye dönük yazıldı.** Kod, 2026-09-26'da story dokümanı olmadan `5e29760` (`feat(auth): inline auth errors, email-confirmation notice, password reset`) commit'iyle yayımlandı. Görevler, kabul kriterleri ve DoD bu commit'in diff'inden çıkarıldı.

Story 1.2, şifre sıfırlamayı "ayrı bir story'ye bırakılabilir" diyerek kapsam dışı bırakmıştı; o story hiç açılmadı. Canlıya çıkıştan sonra (2026-09-21) iki sorun görünür hale geldi:

- Her giriş/kayıt hatası, tek bir genel mesaj taşıyan, stilsiz bir `/error` sayfasına yönlendiriyordu. Mobil `AuthScreen` ise Supabase'in ham İngilizce hata metnini gösteriyordu.
- Canlı Supabase projesinde "Confirm email" açık (dev'de kapalı). Oturumu olmadan dönen bir kayıt, kullanıcıyı sessizce `/login`'e geri atıyordu; kullanıcı onay e-postası beklemesi gerektiğini bilmiyordu.

## Kapsam

- **Shared:** `packages/shared/src/auth/errors.ts` — `authErrorKey(code)`, Supabase `error_code` değerlerini TR/EN mesaj anahtarlarına eşler. Yanlış şifre ve kayıtlı olmayan e-posta, Supabase gibi bilerek aynı mesajı paylaşır (hesabın varlığı açığa çıkmaz). `Messages.auth` altına yeni hata/bildirim metinleri (tr/en).
- **Web — giriş/kayıt:** `/login` artık bir istemci formu (`login-form.tsx`); hatalar formun üzerinde satır içi gösterilir ve e-posta alanı korunur. Oturumsuz dönen kayıt, "e-postanı doğrula" ekranı gösterir.
- **Web — şifre sıfırlama:** `/forgot-password` (sıfırlama bağlantısı ister) → Supabase kurtarma bağlantısı → `/auth/oauth` → `/reset-password` (yeni şifre) → oturum kapatılır → `/login`'de bildirimle giriş.
- **Web — hata sayfası:** `/error` tasarlandı; süresi dolmuş bağlantıları (Supabase'in URL fragment'ından okunur) ve başka tarayıcıda açılan bağlantıları açıklar. Başka tarayıcıda açılan kayıt onayı `/login`'e "e-posta doğrulandı" bildirimiyle düşer.
- **Web — altyapı:** `components/auth/` (`auth-shell`, `notice`, `button-styles`), `lib/site-origin.ts`; `/auth/oauth` yönlendirilen protokolü korur (https'i zorlamaz — yerel `next start` için).
- **Mobil:** `AuthScreen`, ham Supabase metni yerine `authErrorKey` ile çevrilmiş mesajı gösterir.

**Kapsam dışı (takip görevleri):**
- **Mobilde şifremi unuttum / şifre sıfırlama akışı** — yalnızca web'de var. Mobilde derin bağlantı (deep link) ile kurtarma oturumu gerektirir.
- Mobilde "e-postanı doğrula" ekranı.
- Canlıdaki e-posta gönderim sınırı (Supabase yerleşik SMTP'si, saatte ~2 e-posta): sınır aşılınca kayıt ve sıfırlama istekleri `over_email_send_rate_limit` ile reddedilir; UI "Çok fazla deneme yapıldı" gösterir. Kalıcı çözüm özel SMTP'dir (Brevo) ve özel alan adı alınmasını bekliyor.

## Görevler

1. **[Shared]** `authErrorKey` + `AuthErrorMessages` tipleri + tr/en metinler. ✅
2. **[Web]** `/login` satır içi hatalar, e-posta korunması, oturumsuz kayıtta doğrulama ekranı. ✅
3. **[Web]** `/forgot-password` ve `/reset-password` sayfaları + server action'lar. ✅
4. **[Web]** Tasarlanmış `/error` sayfası (süresi dolmuş / başka tarayıcıda açılmış bağlantılar), `/auth/confirm` ve `/auth/oauth` düzeltmeleri. ✅
5. **[Mobil]** `AuthScreen`'de çevrilmiş hata mesajları. ✅
6. **[Mobil]** Şifre sıfırlama ve e-posta doğrulama ekranı. ☐ (kapsam dışı, yukarıya bkz.)

## Kabul Kriterleri

**AC1 — Satır içi hatalar**
- **Given** `/login`, **When** kullanıcı yanlış şifre veya kayıtlı olmayan bir e-posta girerse, **Then** formun üzerinde aynı "e-posta veya şifre hatalı" mesajı seçili dilde görünür, sayfa değişmez ve e-posta alanı dolu kalır.

**AC2 — E-posta onayı bildirimi**
- **Given** "Confirm email" açık bir proje, **When** kullanıcı kayıt olursa, **Then** "e-postanı doğrula" ekranı gösterilir; kullanıcı sessizce giriş sayfasına geri atılmaz.

**AC3 — Şifre sıfırlama**
- **Given** `/forgot-password`, **When** kullanıcı e-postasını girip bağlantıyı açarsa, **Then** `/reset-password`'da yeni şifre belirleyebilir, ardından oturumu kapatılır ve `/login`'de başarı bildirimiyle yeni şifresiyle girebilir.

**AC4 — Anlaşılır hata sayfası**
- **Given** süresi dolmuş veya başka bir tarayıcıda açılmış bir e-posta bağlantısı, **When** kullanıcı açarsa, **Then** `/error` nedenini açıklar ve bir sonraki adımı (yeni bağlantı iste / giriş yap) sunar.

## Definition of Done

- [x] Web ve mobil typecheck + lint temiz, CI yeşil.
- [x] **Gerçek tarayıcıda uçtan uca doğrulandı** (commit oturumu, 2026-09-26; yöntem `feedback_real_browser_verification` tarifinde kayıtlı): gerçek sıfırlama e-postası dev projesinin SMTP'si üzerinden bir mailinator test adresine gönderildi, bağlantı isteği yapan aynı tarayıcı bağlamında (PKCE doğrulayıcı çerezi) açıldı ve yeni şifreyle giriş yapıldı. Yalnızca canlıda görülen "e-postanı doğrula" durumu, dev'de `mailer_autoconfirm` açık olduğu için Supabase yanıtı taklit edilerek doğrulandı.
- [x] Canlı auth yapılandırması kontrol edildi (2026-09-26): "Confirm email" açık, `https://web-three-kappa-87.vercel.app/**` yönlendirme izin listesinde; kullanıcı onay e-postasının geldiğini teyit etti.
- [ ] Mobil cihaz/simülatör doğrulaması — bu ortamda yok.
