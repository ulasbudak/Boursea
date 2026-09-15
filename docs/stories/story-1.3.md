---
title: "Story 1.3: Dil Seçimi ve Yerelleştirme Temeli"
epic: "Epic 1 — Kimlik Doğrulama, Hisse Keşfi ve Temel Altyapı"
story_id: "1.3"
status: done
created: 2026-09-15
updated: 2026-09-15
author: Bob (BMAD Scrum Master)
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md"]
depends_on: ["1.1", "1.2"]
---

# Story 1.3: Dil Seçimi ve Yerelleştirme Temeli

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want uygulama dilini Türkçe veya İngilizce olarak seçebilmek,
So that uygulamayı kendi dilimde rahatça kullanabileyim.

*(Kaynak: `docs/epics.md` §5, Epic 1 — Story 1.3; PRD FR-090, FR-091.)*

**Not:** Bu story backlog sırasında iki kez ertelenmişti (Story 1.4 ve 1.5 önce yapıldı — bkz. `docs/stories/story-1.4.md`, `docs/stories/story-1.5.md`). Şimdi geriye dönüp uygulanıyor; bu nedenle "temel" (foundation) olması gereken bu story, o iki story'de zaten inşa edilmiş tüm ekranları (giriş, panel, arama, hisse genel bakış) da geriye dönük olarak yerelleştiriyor.

## Bağlam

`architecture.md` §5 tablosu dil tercihini `identity` modülünün sorumluluğu olarak işaretler (FR-090). Ancak backend'de henüz bir kullanıcı profili tablosu/migration altyapısı yok (yalnızca Supabase Auth JWT doğrulama var — bkz. Story 1.2). Yeni bir Postgres tablosu ve migration süreci icat etmek yerine, bu story dil tercihini **Supabase Auth'un kendi `user_metadata` alanına** yazar (`supabase.auth.updateUser({ data: { locale } })`) — bu zaten AD-3 kapsamında kullanılan kimlik sağlayıcısının bir parçasıdır ve "identity dil tercihini sahiplenir" ilkesini yeni bir backend bileşeni icat etmeden karşılar. Gerçek bir kullanıcı profili tablosu ileride eklenirse, tercih oradan okunacak şekilde taşınabilir.

Çeviri ve sayı/para birimi biçimlendirme mantığı `packages/shared` içine kondu (bu paket daha önce yalnızca OpenAPI tip üretimi için bir iskeletti, ilk kez gerçek içerik kazandı) — web ve mobilin aynı çeviri sözlüğünü ve aynı `Intl`-tabanlı biçimlendirme fonksiyonlarını kullanması NFR-6 (Platformlar Arası Tutarlılık) gereğidir.

## Kapsam

- **`packages/shared`:** `tr`/`en` mesaj sözlükleri, `resolveLocale`/`resolveLocaleFromAcceptLanguage` (cihaz/tarayıcı dili tespiti), `formatPrice`/`formatChange`/`formatMarketCap` (locale'e göre `Intl.NumberFormat`).
- **Web:** İlk açılışta `Accept-Language` header'ından dil tespiti (SSR, `next/headers`); `trendus_locale` cookie'siyle kalıcılık; oturum açıksa `user_metadata.locale` önceliklidir; `/settings` sayfasında dil değiştirme; mevcut tüm sayfalar (`/`, `/login`, `/error`, `/dashboard`, `/stock/[exchange]/[symbol]`) çeviriye taşındı; hisse genel bakış sayfasındaki sabit `"tr-TR"` biçimlendirmesi `locale`'e duyarlı hale getirildi.
- **Mobil:** İlk açılışta `expo-localization` ile cihaz dili tespiti; `AsyncStorage` ile kalıcılık; oturum açıksa `user_metadata.locale` senkronize edilir; yeni bir `SettingsScreen` (mevcut ekranlar arası geçiş deseniyle, ayrı bir navigasyon kütüphanesi eklenmeden); tüm mevcut ekranlar (`AuthScreen`, `HomeScreen`, `SearchBox`, `StockOverviewScreen`) çeviriye taşındı.

**Kapsam dışı:**
- Yeni bir backend kullanıcı profili tablosu/migration altyapısı — dil tercihi Supabase `user_metadata` üzerinden çözülüyor (yukarıda gerekçelendirildi).
- Türkçe/İngilizce dışında ek diller.
- Web'de yol tabanlı locale routing (örn. `/tr/...`, `/en/...`) — cookie + `Accept-Language` tabanlı çözüm MVP için yeterli.

## Görevler

1. **[Shared]** `packages/shared/src/i18n/`: `types.ts` (`Messages` arayüzü), `locale.ts` (`SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `resolveLocale`, `resolveLocaleFromAcceptLanguage`), `format.ts` (`formatPrice`, `formatChange`, `formatMarketCap`), `messages/en.ts`, `messages/tr.ts`.
2. **[Web]** `next.config.ts`'e `transpilePackages: ["@trendus/shared"]`; `src/lib/i18n/locale.ts`: `getLocale()` (öncelik: `user_metadata.locale` → `trendus_locale` cookie → `Accept-Language`).
3. **[Web]** `/settings` sayfası + `LanguageSwitcher` (client) + `setLocale` server action (cookie + `updateUser` + `revalidatePath`).
4. **[Web]** `layout.tsx`, `page.tsx`, `login/page.tsx`, `login/social-buttons.tsx`, `error/page.tsx`, `dashboard/page.tsx`, `dashboard/search-box.tsx`, `stock/[exchange]/[symbol]/page.tsx` çeviriye taşındı.
5. **[Mobil]** `expo-localization` eklendi; `apps/mobile/metro.config.js` (pnpm monorepo'da `@trendus/shared`'ı çözebilmesi için `watchFolders`/`nodeModulesPaths`).
6. **[Mobil]** `lib/locale-context.tsx`, `lib/locale-provider.tsx` (AsyncStorage kalıcılığı + `user_metadata` senkronizasyonu + cihaz dili tespiti); `App.tsx`'e `LocaleProvider` sarmalayıcısı.
7. **[Mobil]** `SettingsScreen.tsx` (yeni); `AuthScreen`, `HomeScreen`, `SearchBox`, `StockOverviewScreen` çeviriye taşındı.

## Kabul Kriterleri

**AC1 — İlk açılışta cihaz/tarayıcı dili**
- **Given** ilk açılış (kayıtlı tercih yok), **When** cihaz/tarayıcı dili Türkçe veya İngilizce ise, **Then** uygulama o dilde açılır; desteklenmeyen bir dilse İngilizce varsayılan olur.

**AC2 — Ayarlar ekranından dil değişimi ve kalıcılık**
- **Given** ayarlar ekranı (web: `/settings`, mobil: `HomeScreen` içinden "Ayarlar"), **When** kullanıcı dili değiştirirse, **Then** tüm arayüz metinleri anında seçilen dile döner ve tercih kalıcı olarak saklanır (web: cookie + oturum açıksa `user_metadata`; mobil: `AsyncStorage` + oturum açıksa `user_metadata`) (FR-090).

**AC3 — Sayı/para birimi biçimleri dile göre uyarlanır**
- **And** hisse genel bakış sayfasındaki fiyat/değişim/piyasa değeri gösterimleri seçilen dile göre `Intl.NumberFormat` ile biçimlendirilir (FR-091).

## Definition of Done

- [x] AC1–AC3 karşılanıyor.
- [x] Backend: pytest 30/30 yeşil (bu story backend'e dokunmadı, regresyon kontrolü için çalıştırıldı).
- [x] Web: typecheck/lint/build temiz (`/settings` rotası dahil tüm sayfalar derleniyor).
- [x] Mobil: typecheck/lint temiz; Metro bundle testi hem iOS hem Android platformları için başarılı (yeni `@trendus/shared`/`expo-localization` bağımlılıkları pnpm monorepo'sunda doğru çözümleniyor).

## Teknik Notlar

- `packages/shared` ilk kez gerçek içerik taşıyor; hem web (Next.js/Turbopack, `transpilePackages` ile) hem mobil (Metro, özel `metro.config.js` ile) TypeScript kaynağını doğrudan (derlemeden) tüketiyor.
- Supabase JWT claims'i (`getClaims()` / `onAuthStateChange` session'ı) `user_metadata` alanını içerir; bu, `raw_user_meta_data` sütununa yazılan özel alanların (`locale` dahil) okunmasını sağlar.
- Web'de dil değişikliği bir Server Action (`setLocale`) üzerinden cookie yazıp `revalidatePath("/", "layout")` çağırır; mobilde ise doğrudan React Context state'i güncellenir (senkron/anında), `AsyncStorage`/`user_metadata` yazımı arka planda devam eder.
