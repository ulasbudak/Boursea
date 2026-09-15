---
title: "UI/UX Tasarım Sistemi — Karanlık Mod Öncelikli Fintech Arayüzü"
epic: "Cross-cutting — tüm epic'lerin ekranlarını kapsar (Epic 1–8); ayrı bir FR'ye bağlı değil"
story_id: "UI.1"
status: in-progress
created: 2026-09-15
updated: 2026-09-16
author: "Sally (BMAD UX Designer), Bob (BMAD Scrum Master) & Amelia (BMAD Developer)"
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md §2.4"]
---

# UI/UX Tasarım Sistemi — Karanlık Mod Öncelikli Fintech Arayüzü

## Kullanıcı Hikayesi

As a **Trendus kullanıcısı (aktif trader)**,
I want uygulamayı uzun süre ekranda tutarken gözü yormayan, finansal verileri (kazanç/kayıp, RSI, skor) net biçimde ayırt edebildiğim, modern ve güvenilir hissettiren bir arayüz,
So that verilere odaklanabileyim ve uygulamaya güvenerek gerçek para kararları verebileyim.

*(Kaynak: `docs/epics.md` §2.4 — "UX tasarım dokümanı henüz üretilmediği için bu backlog PRD + Architecture'a dayanır"; bu story o boşluğu kapatan ilk UX-DR temelini oluşturur.)*

## Bağlam

Projenin tüm fonksiyonel story'leri (Epic 1–4) şimdiye kadar **sıfır görsel tasarımla** teslim edildi: web tarafı düz semantik HTML (`<div>`, `<p>`, `<button>`, class'sız) ve tarayıcı varsayılan stilleriyle çalışıyor; mobil taraf ise React Native `StyleSheet` içinde sabit, elle yazılmış renklerle (`#111`, `#ccc`, `#eee`), dark mode desteği olmadan (`userInterfaceStyle: "light"` ile kilitli) çalışıyor. Bu, işlevsellik doğrulaması için yeterliydi ama üründen beklenen "modern finans uygulaması" hissini vermiyor.

Bu story bir **tasarım sistemi temeli** kurar: tek bir kaynaktan (`packages/shared/src/theme/tokens.ts`) beslenen, hem web (Tailwind v4) hem mobil (React Native) tarafından tüketilen renk/spacing/tipografi token'ları. Karanlık mod **öncelikli/varsayılan** moddur — grafik-yoğun bir trading uygulamasında uzun ekran süresi ve OLED okunabilirliği için standart tercih; açık mod tam destekli ikincil moddur.

Kapsam gereği **tüm ekranları tek seferde yeniden tasarlamak yerine**, bu story (a) token sistemini + paylaşılan bileşen kütüphanesinin temelini kurar, (b) en çok görülen giriş noktalarını (login, dashboard, mobil ana ekran) örnek/referans implementasyon olarak yeniden tasarlar, (c) geri kalan ekranlar (hisse detay/grafik sayfası, screener, settings, mobil diğer ekranlar) için net bir görev listesi bırakır.

## Kapsam

**Bu PR'da tamamlanan:**
- `packages/shared/src/theme/tokens.ts`: renk paleti (dark + light), spacing ölçeği, radius, tipografi ölçeği, `signColor()` yardımcı fonksiyonu — tek kaynak.
- **Web:** Tailwind CSS v4 kurulumu (`@tailwindcss/postcss`), `globals.css`'te runtime CSS custom property'leri ile dark-first tema (`prefers-color-scheme` + `[data-theme]` hook'u ileride manuel tema değiştirici için hazır).
- **Web bileşen kütüphanesi** (`apps/web/src/components/ui/`): `Button`, `Card`/`CardHeader`/`CardTitle`, `Input`/`Select`/`Label`/`Field`, `ChangeValue`/`Badge` (kazanç/kayıp renklendirme).
- **Web ekranları yeniden tasarlandı:** `/login` (kart düzeni, form alanları, sosyal giriş butonları), `/dashboard` (header + arama kartı + nav kartları).
- **Mobil:** `lib/theme.ts` (`useTheme()` hook'u, `useColorScheme()` ile otomatik dark/light), `app.json`'da `userInterfaceStyle: "automatic"`, `HomeScreen.tsx` yeniden tasarlandı (kart tabanlı düzen, tema renkleri).

**Sonraki PR'da tamamlanan (görev 7-10):**
- Hisse detay sayfası (`/stock/[exchange]/[symbol]` — grafik, teknik/temel paneller, skor kartı, sinyal listesi, tab'lar) yeni bileşen sistemine taşındı; `lightweight-charts` renkleri (`layout.textColor`, mum/indikatör/çizim renkleri) `getComputedStyle` ile `--tk-*` CSS değişkenlerinden okunuyor (bkz. `price-chart.tsx::cssVar`).
- `/screener` sayfası ve mobil `ScreenerScreen` yeni sisteme taşındı; ayrıca skorlama motoruyla hizalı varsayılan kriterler (`SUGGESTED_CRITERIA`) eklendi.
- `/settings` sayfası `Card`/`PageHeader`/`ToggleChip` ile yeniden tasarlandı.
- Mobil `SearchBox`, `StockOverviewScreen`, `SettingsScreen`, `AuthScreen` `useTheme()`/`makeStyles(colors)` desenine taşındı.
- Manuel tema değiştirici: `apps/web/src/components/ui/theme-toggle.tsx` (+ `/settings` sayfasında kullanımı), `localStorage` (`trendus-theme` anahtarı) ile kalıcı, `layout.tsx`'teki `beforeInteractive` script'i hydration öncesi `[data-theme]` uygulayarak yanlış temanın kısa süreliğine görünmesini (FOUC) engelliyor.

**Bu PR'da tamamlanan (görev 11):**
- Mobil `FundamentalsPanel`, `ScoreBadge`, `SignalList`, `HistoricalPerformanceChart`, `PriceChartWebView` — Tasarım Sistemi Spesifikasyonu §2'ye uygun şekilde `useTheme()`/`makeStyles(colors)` desenine taşındı; `PriceChartWebView`'ın gömülü `lightweight-charts` HTML'i artık mevcut temanın (`positive`/`negative`/`accent`/`warning`/`border*`/`text*`) renklerini kullanıyor.

**Kapsam dışı (bu depoda henüz yok):**
- Mobil tarafta manuel tema değiştirici (web'deki `/settings` tema toggle'ının mobil karşılığı) — mobil şu an yalnızca `useColorScheme()` sistem tercihini izliyor.

## Tasarım Sistemi Spesifikasyonu

*(Sally — BMAD UX Designer)*

Bu bölüm, dağınık `Teknik Notlar` bilgisini tek bir bağlayıcı spesifikasyona dönüştürür — yeni bir ekran/bileşen eklerken referans alınacak kaynak budur.

### 1. Renk Paleti

| Token | Dark (varsayılan) | Light | Kullanım |
|---|---|---|---|
| `canvas` | `#0A0B0D` | `#F8FAFC` | Sayfa/ekran arka planı |
| `surface` | `#121417` | `#FFFFFF` | Kart, panel arka planı |
| `surfaceHover` | `#1A1D21` | `#F1F5F9` | Hover/basılı durum, rozet arka planı |
| `surfaceElevated` | `#1E2126` | `#FFFFFF` | Input, modal/sheet, yükseltilmiş yüzey |
| `borderSubtle` | `#23262B` | `#E5E7EB` | Kart kenarlığı, ayraç çizgisi |
| `borderDefault` | `#2E3239` | `#D1D5DB` | Input/aktif kenarlık, grafik eksen çizgisi |
| `textPrimary` | `#F4F5F7` | `#0F172A` | Başlık, birincil değer |
| `textSecondary` | `#9CA3AF` | `#475569` | Etiket, ikincil metin |
| `textTertiary` | `#6B7280` | `#94A3B8` | Meta bilgi, placeholder, disclaimer |
| `accent` | `#3B82F6` | `#2563EB` | Birincil aksiyon, aktif sekme/chip, link |
| `accentText` | `#EFF6FF` | `#FFFFFF` | `accent` zemin üzerindeki metin |
| `positive` | `#34D399` | `#16A34A` | Kazanç, boğa (bullish) sinyali, "Al" |
| `negative` | `#F87171` | `#DC2626` | Kayıp, ayı (bearish) sinyali, "Sat" |
| `warning` | `#F59E0B` | `#D97706` | Uyarı metni, nötr skor rozeti, RSI aşırı bölge |
| `info` | `#38BDF8` | `#0284C7` | Bilgilendirme rozetleri (şu an kullanımda değil, rezerve) |

**Kural:** Hiçbir bileşende elle hex kodu yazılmaz. Web `bg-*`/`text-*` Tailwind utility'leri, mobil `colors.*` (bkz. `useTheme()`) üzerinden erişilir. İstisna: `PriceChartWebView`'ın gömülü HTML/JS `<script>`'i — DOM içinde çalıştığı için token değerleri JS tarafında bir defaya mahsus enjekte edilir (bkz. Görev 11).

### 2. Finansal Kart/Düzen Kalıpları

- **Skor rozeti (`ScoreBadge`):** Büyük sayısal değer (`/100`) + yanında durum rozeti (`Al`→positive, `Sat`→negative, `Nötr`→warning zemin/metin, `bg-{ton}/15 text-{ton}` opaklığında). Rasyonel metin `textSecondary`. Faktör dökümü varsayılan gizli, bir toggle ile açılır; her faktör bir `ProgressBar` (`points/max_points`) ile gösterilir.
- **Sinyal listesi (`SignalList`):** Her satır bir ikon rozeti (dairesel, `bullish`→positive/15 zemin, `bearish`→negative/15 zemin) + yön etiketi (kalın, ton rengi) + kural adı (`textPrimary`) + sağda tarih (`textTertiary`, `ml-auto`). Satırlar `borderSubtle` ile ayrılır, tam genişlik kart içinde.
- **Temel veri satırları (`FundamentalsPanel`):** Etiket solda (`textSecondary`), değer sağda (`textPrimary`, tabular-nums), altında küçük punto sektör ortalaması + fark yüzdesi (`ChangeValue`/`signColor` ile işaretli renk). Satırlar kart içinde `borderSubtle` ayraçlı.
- **Mini bar grafik (`HistoricalPerformanceChart`):** Çubuklar `accent` (nötr) rengiyle; dönem seçici (`annual`/`quarterly`) bir chip/toggle çifti, aktif olan `accent` metin + kalın.
- **Mum/çizgi grafik (`PriceChartWebView`, `price-chart.tsx`):** yükseliş `positive`, düşüş `negative`, aktif gösterge/vurgu `accent`, çizim araçları (trend/yatay çizgi) `warning`, eksen/grid `borderSubtle`/`borderDefault`, eksen metni `textSecondary`.
- **Genel kart:** `surface` zemin, `borderSubtle` 1px kenarlık, `radius.lg` (14px), `spacing[4]` (16px) iç boşluk — web `Card` bileşeni ve mobilde `makeStyles(colors)` içindeki eşdeğer stil bu kalıba uyar.

### 3. Karanlık Mod Kuralları

- Karanlık, sistem tercihi belirtilmediğinde **varsayılan**dır (bkz. AC2).
- Web: `prefers-color-scheme` + manuel `[data-theme]` override (öncelik sırası: manuel > sistem > varsayılan-dark).
- Mobil: `useColorScheme()` (sistem tercihi olmayan cihazlarda React Native `null`/`undefined` döner → `"light"` DEĞİLSE dark'a düş, bkz. `lib/theme.ts::useTheme`).
- Hiçbir ekran ikisi arasında (ör. yarı temalı bir kart) karışık kalmamalı — bir ekran temalandırıldığında **tüm** alt bileşenleri de aynı PR'da temalandırılmalı (Görev 9'un ıskaladığı `StockOverviewScreen` alt bileşenleri bu kuralın istisnası olarak Görev 11'de kapatılıyor).

## Görevler

1. **[Tasarım]** Renk paleti, spacing, tipografi ölçeğini `packages/shared/src/theme/tokens.ts`'te tanımla. ✅
2. **[Web]** Tailwind v4 kur, `globals.css`'i token'lara göre yeniden yaz (dark-first + light override + manuel tema hook'u). ✅
3. **[Web]** Paylaşılan UI primitifleri (`Button`, `Card`, `Input`/`Select`/`Label`, `ChangeValue`/`Badge`) oluştur. ✅
4. **[Web]** `/login` ve `/dashboard` (+ `SearchBox`, `SocialButtons`) sayfalarını yeni sisteme taşı. ✅
5. **[Mobil]** `lib/theme.ts` hook'unu oluştur, `app.json`'da otomatik dark mode'u aç. ✅
6. **[Mobil]** `HomeScreen.tsx`'i yeni tema sistemine taşı. ✅
7. **[Web]** `/screener` sayfasını ve `/settings`'i yeni sisteme taşı. ✅
8. **[Web]** Hisse detay sayfasını (skor kartı, temel/teknik paneller, grafik araç çubuğu) yeni sisteme taşı; `lightweight-charts` renklerini (`layout.textColor`, mum/indikatör renkleri) token paletine bağla. ✅
9. **[Mobil]** `ScreenerScreen`, `SearchBox`, `StockOverviewScreen`, `SettingsScreen`, `AuthScreen`'i yeni tema sistemine taşı. ✅
10. **[Web]** Manuel tema değiştirici (dark/light toggle) UI elemanı ekle; `localStorage` + `[data-theme]` ile kalıcı hale getir. ✅
11. **[Mobil]** `FundamentalsPanel`, `ScoreBadge`, `SignalList`, `HistoricalPerformanceChart`, `PriceChartWebView`'ı yeni tema sistemine taşı (Tasarım Sistemi Spesifikasyonu §2'deki kart/rozet/grafik kalıplarına uygun); `PriceChartWebView`'ın gömülü grafik HTML'ine tema renklerini enjekte et. ✅

## Kabul Kriterleri

**AC1 — Tek kaynaktan tema**
- **Given** hem web hem mobil kod tabanı, **When** bir renk token'ı değişirse, **Then** değişiklik `packages/shared/src/theme/tokens.ts`'ten yapılır ve her iki platforma da yayılır (renk değerleri iki yerde elle senkronize edilmez — web'in CSS değişkenleri bu dosyayla sayısal olarak eşleşir).

**AC2 — Karanlık mod varsayılan**
- **Given** sistem tema tercihi belirtilmemiş bir cihaz, **When** uygulama (web veya mobil) açılırsa, **Then** karanlık mod görüntülenir.

**AC3 — Açık mod tam destekli**
- **Given** kullanıcının işletim sistemi açık moda ayarlı, **When** uygulama açılırsa, **Then** okunabilir, tutarlı bir açık mod görüntülenir (web: `prefers-color-scheme: light`; mobil: `useColorScheme()`).

**AC4 — Kazanç/kayıp renklendirmesi**
- **Given** işaretli (pozitif/negatif) bir finansal değer gösteren herhangi bir ekran, **When** değer render edilirse, **Then** tutarlı yeşil/kırmızı semantiği kullanılır (`ChangeValue`/`signColor()` üzerinden, elle hex kodu yazılmaz).

**AC5 — Refactor edilen ekranlar çalışır durumda**
- **Given** `/login`, `/dashboard`, mobil `HomeScreen`, **When** kullanıcı bu ekranları kullanırsa, **Then** önceki tüm işlevsellik (giriş/kayıt, arama, navigasyon, çıkış) korunur — yalnızca görsel katman değişir.

## Definition of Done

- [x] `packages/shared` typecheck yeşil.
- [x] Web: typecheck, lint, `next build` yeşil; Tailwind çıktısında token tabanlı utility'ler (`bg-accent` vb.) derlenmiş olarak doğrulandı.
- [x] Mobil: typecheck, lint, Metro bundle yeşil (695 modül).
- [x] Görevler #7–11 tamamlandı (bkz. yukarı, "Sonraki/Bu PR'da tamamlanan").
- [ ] Gerçek bir tarayıcıda/cihazda görsel doğrulama — bu oturumda tarayıcı/simülatör otomasyon aracı yoktu; kullanıcı özellikle `PriceChartWebView`'daki gömülü grafiğin (mum/çizgi/çizim renkleri) hem koyu hem açık modda doğru göründüğünü bir cihazda/simülatörde onaylamalı.

## Teknik Notlar

- **Palet (dark, öncelikli):** canvas `#0A0B0D`, surface `#121417`, accent `#3B82F6`, positive `#34D399`, negative `#F87171`. Tam liste ve light varyantı: `packages/shared/src/theme/tokens.ts`.
- **Web:** Tailwind v4 CSS-native `@theme` bloğu kullanılıyor (JS config dosyası yok). Renk utility'leri (`bg-canvas`, `text-accent` vb.) runtime CSS değişkenlerine (`--tk-*`) map'leniyor, böylece `prefers-color-scheme` veya ileride eklenecek bir `data-theme` toggle'ı derleme zamanı değil çalışma zamanında tema değiştirebiliyor.
- **Mobil:** `userInterfaceStyle: "automatic"` olmadan `useColorScheme()` sistem temasını doğru yansıtmıyordu (önceden `"light"` ile kilitliydi) — bu değişiklik olmadan dark mode hiç tetiklenmezdi.
- **Neden Tailwind (JS-in-CSS değil):** Proje zaten Next.js App Router + Server Components kullanıyor; Tailwind'in build-time utility yaklaşımı ek runtime/hydration maliyeti getirmiyor ve `packages/shared` token'larıyla CSS custom property köprüsü üzerinden birebir eşleşiyor.
