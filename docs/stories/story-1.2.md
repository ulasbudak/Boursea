---
title: "Story 1.2: Kullanıcı Kaydı ve Girişi"
epic: "Epic 1 — Kimlik Doğrulama, Hisse Keşfi ve Temel Altyapı"
story_id: "1.2"
status: done
created: 2026-09-15
updated: 2026-09-15
author: Bob (BMAD Scrum Master)
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md"]
depends_on: ["1.1"]
---

# Story 1.2: Kullanıcı Kaydı ve Girişi

## Kullanıcı Hikayesi

As a **yeni kullanıcı**,
I want e-posta veya Google/Apple hesabımla kayıt olup giriş yapabilmek,
So that kişisel izleme listemi, portföyümü ve tercihlerimi kaydedebileyim.

*(Kaynak: `docs/epics.md` §5, Epic 1 — Story 1.2; PRD FR-060.)*

## Bağlam

Story 1.1'de kurulan monorepo iskeleti üzerine, uygulamanın ilk gerçek iş özelliğini — kimlik doğrulamayı — ekler. `docs/architecture.md` AD-3'te (Tek Veri Platformu — Supabase) belirlenen karar gereği Supabase Auth kullanılır; backend bu oturumları kendi JWT doğrulama middleware'i ile doğrular (AD-4'ün ön koşulu: gerçek zamanlı/korumalı endpoint'ler için kimlik bilgisi burada kurulur).

**Önemli güncel teknik not:** Supabase Auth artık simetrik (paylaşılan sır) yerine **asimetrik JWT imzalama anahtarları (JWKS)** kullanıyor. Backend doğrulaması `GET {SUPABASE_URL}/auth/v1/.well-known/jwks.json` üzerinden alınan public key ile (RS256/ES256), `issuer={SUPABASE_URL}/auth/v1` ve `audience=authenticated` kontrolleriyle yapılmalıdır — eski "JWT secret" yöntemi kullanılmamalıdır.

## Kapsam

- **Backend:** Supabase JWT doğrulama bağımlılığı (JWKS tabanlı) + korumalı `GET /me` endpoint'i.
- **Web:** `@supabase/ssr` ile giriş/kayıt sayfası (e-posta+şifre, Server Actions), oturum yenileme (`proxy.ts`), OAuth (Google/Apple) callback route'u, e-posta onay callback'i, korumalı `/dashboard` sayfası, hata sayfası.
- **Mobil:** `@supabase/supabase-js` ile e-posta+şifre kayıt/giriş ekranı, oturum durumuna göre koşullu ekran render'ı.

**Kapsam dışı (bu story'de yapılmayacak, gerekçesiyle):**
- **Mobilde native Google/Apple OAuth** — gerçek native SDK entegrasyonu (Apple: `expo-apple-authentication`, Google: native sign-in) bir **EAS/dev-client build** gerektirir (düz Expo Go'da çalışmaz) ve Google Cloud Console / Apple Developer hesabından gerçek OAuth istemci kimlik bilgileri ister; bunlar bu oturumda temin edilemez. Web'de OAuth tamamen tarayıcı yönlendirmesiyle çalıştığından (native modül gerektirmez) bu story'de yalnızca **web** için Google/Apple OAuth butonları eklenecektir. Mobil native OAuth ayrı bir story olarak ele alınmalıdır.
- Şifremi unuttum / şifre sıfırlama akışı (ayrı bir story'ye bırakılabilir, PRD'de ayrı bir FR olarak tanımlı değil).
- Kullanıcı profil düzenleme ekranı (yalnızca kayıt/giriş kapsamda).

## Görevler

1. **[Backend]** `PyJWT[crypto]` bağımlılığını ekle; `app/auth.py` içinde JWKS tabanlı doğrulama fonksiyonu ve `get_current_claims` FastAPI dependency'sini yaz.
2. **[Backend]** `GET /me` endpoint'ini `get_current_claims`'e bağımlı olacak şekilde ekle; token yoksa/geçersizse 401 dön.
3. **[Backend]** Gerçek ağ çağrısı olmadan test edilebilir birim testleri yaz (yerel RSA anahtar çifti ile imzalanmış test token'ı, süresi dolmuş token, yanlış issuer/audience senaryoları).
4. **[Web]** `@supabase/ssr` + `@supabase/supabase-js` kur; `lib/supabase/{client,server,proxy}.ts` ve kök `proxy.ts` dosyalarını resmi güncel desene göre oluştur.
5. **[Web]** `/login` sayfası: e-posta+şifre ile Sign In / Sign Up Server Actions'ları + Google/Apple OAuth butonları.
6. **[Web]** `/auth/oauth` (OAuth code exchange) ve `/auth/confirm` (e-posta onay) route handler'ları; `/error` sayfası.
7. **[Web]** `/dashboard` korumalı sayfası (`getClaims()` ile oturum kontrolü, yoksa `/login`'e yönlendirme); ana sayfaya giriş/panel linki.
8. **[Mobil]** `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `react-native-url-polyfill` kur; `lib/supabase.ts` resmi desene göre oluştur.
9. **[Mobil]** E-posta+şifre ile kayıt/giriş ekranı; oturum durumuna göre `App.tsx`'te koşullu ekran gösterimi (giriş yapılmışsa e-posta + çıkış butonu gösteren basit bir ana ekran).
10. **[Hepsi]** `.env.example` dosyalarına gerekli Supabase değişkenlerini ekle; kök `README.md`'yi güncelle.

## Kabul Kriterleri

**AC1 — E-posta ile kayıt (web)**
- **Given** `/login` sayfası, **When** kullanıcı e-posta+şifre girip "Kayıt Ol" ile gönderirse, **Then** Supabase Auth üzerinde hesap oluşturulur ve kullanıcıya onay e-postası gönderildiği bilgisi gösterilir (veya proje ayarına göre doğrudan oturum açılır).
- **And** kayıt sırasında bir hata oluşursa (örn. e-posta zaten kayıtlı) kullanıcı `/error` sayfasına yönlendirilir, ham hata detayı sızdırılmaz.

**AC2 — E-posta ile giriş (web)**
- **Given** kayıtlı bir kullanıcı, **When** doğru e-posta+şifre ile "Giriş Yap" derse, **Then** oturum açılır ve `/dashboard` sayfasına yönlendirilir.
- **Given** geçersiz kimlik bilgileri, **When** giriş denerse, **Then** anlaşılır bir hata durumu gösterilir (hesap kilitlenmez).

**AC3 — Google/Apple ile giriş (web)**
- **Given** `/login` sayfası, **When** kullanıcı "Google ile devam et" veya "Apple ile devam et" butonuna basarsa, **Then** `signInWithOAuth` ile ilgili sağlayıcıya yönlendirilir; başarılı dönüşte `/auth/oauth` route'u kodu oturuma çevirip `/dashboard`'a yönlendirir.
- **And** sağlayıcılar Supabase Dashboard'da henüz etkinleştirilmemişse buton yine de tıklanabilir olur ama Supabase'in döndürdüğü hata `/error` sayfasında gösterilir (kod tarafında bir varsayım/gizli hata yoktur).

**AC4 — Oturum yenileme ve korumalı sayfa (web)**
- **Given** aktif bir oturum, **When** kullanıcı `/dashboard`'a gelirse, **Then** `proxy.ts` üzerinden oturum sunucu tarafında `getClaims()` ile doğrulanır ve sayfa kullanıcının e-postasını gösterir.
- **Given** oturum yoksa, **When** kullanıcı `/dashboard`'a gitmeye çalışırsa, **Then** `/login`'e yönlendirilir.

**AC5 — E-posta+şifre ile kayıt/giriş (mobil)**
- **Given** mobil uygulama açık ekranı, **When** kullanıcı e-posta+şifre girip kayıt olur veya giriş yaparsa, **Then** Supabase oturumu `AsyncStorage`'da kalıcı olarak saklanır ve uygulama oturum açılmış ana ekrana geçer.
- **Given** geçersiz kimlik bilgileri, **When** giriş denerse, **Then** ekranda anlaşılır bir hata mesajı gösterilir.
- **And** kullanıcı çıkış yaptığında oturum temizlenir ve giriş ekranına dönülür.

**AC6 — Backend JWT doğrulama**
- **Given** `GET /me` endpoint'i, **When** istek `Authorization` header'ı olmadan yapılırsa, **Then** `401` döner.
- **Given** geçerli bir Supabase JWT'si (JWKS ile doğrulanabilen, doğru `iss`/`aud` değerlerine sahip), **When** `Authorization: Bearer <token>` ile istek yapılırsa, **Then** `200` ve token'daki `sub`/`email` claim'lerini içeren bir yanıt döner.
- **Given** süresi dolmuş veya imzası geçersiz bir token, **When** istek yapılırsa, **Then** `401` döner (sessiz kabul yok).

## Definition of Done

- [x] AC1–AC6 karşılanıyor ve doğrulandı (backend: pytest 10/10; web: typecheck/lint/build + gerçekçi env ile çalışma zamanı testi; mobil: typecheck/lint + Metro bundle testi).
- [x] `.env.example` dosyaları güncel Supabase değişkenlerini içeriyor; gerçek anahtar commit edilmedi.
- [x] CI ile aynı komutlar (`web`, `mobile`, `api` lint/typecheck/build/test) yerel olarak yeşil; ilk push sonrası GitHub Actions'ta da doğrulanacak.
- [x] Kapsam dışı bırakılan mobil native OAuth, bu dosyada ve ana backlog'da (`docs/epics.md`) açıkça not edildi; gizlenmedi.

## Teknik Notlar

- JWKS URL: `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`; issuer: `{SUPABASE_URL}/auth/v1`; audience: `authenticated`; algoritmalar: RS256/ES256 (kaynak: Supabase resmi dokümantasyonu, 2026).
- Web: `@supabase/ssr` paketi ve `createBrowserClient` / `createServerClient` / `proxy.ts` (Next.js'in güncel middleware konvansiyonu — `middleware.ts` değil `proxy.ts` + `export async function proxy(...)`) — resmi `supabase/supabase` deposundaki `examples/auth/nextjs` ve `examples/auth/nextjs-full` referans alınmıştır.
- Mobil: `lib/supabase.ts` — `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `AsyncStorage`, `AppState` ile `startAutoRefresh`/`stopAutoRefresh` (resmi `examples/auth/quickstarts/react-native` referans alınmıştır).
- Bu story'nin çalışması için gerçek bir Supabase projesi ve `.env` dosyalarının doldurulması gerekir (bkz. README); kod, kimlik bilgileri olmadan da derlenir/test edilir ama uçtan uca canlı doğrulama için proje kurulumu kullanıcı tarafında yapılmalıdır.
