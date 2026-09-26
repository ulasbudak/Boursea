---
title: "Story 1.1: Proje İskeleti ve Temel Altyapı Kurulumu"
epic: "Epic 1 — Kimlik Doğrulama, Hisse Keşfi ve Temel Altyapı"
story_id: "1.1"
status: done
created: 2026-09-15
updated: 2026-09-26
author: Bob (BMAD Scrum Master)
based_on: ["docs/PRD.md", "docs/architecture.md"]
depends_on: []
---

# Story 1.1: Proje İskeleti ve Temel Altyapı Kurulumu

## Kullanıcı Hikayesi

As a **geliştirici (solo)**,
I want web, mobil ve backend uygulamalarının çalışan bir iskeletini ve bunları birbirine bağlayan temel altyapıyı (veritabanı bağlantısı, ortam değişkeni yönetimi, CI) kurmak,
So that Epic 1'in sonraki story'lerinden (kayıt/giriş, arama, genel bakış) itibaren gerçek özellik geliştirmeye hiçbir teknik engel olmadan başlayabileyim.

## Bağlam

Bu, backlog'daki **ilk geliştirme adımıdır** — hiçbir story buna bağlı değildir, ama Epic 1'deki tüm sonraki story'ler (1.2–1.5) ve dolayısıyla tüm proje bu story'nin çıktısı üzerine inşa edilir. `docs/architecture.md` içinde tanımlanan teknoloji seçimlerini ve AD-1 (Modüler Monolit), AD-2 (Dil/Runtime Ayrımı ve Tip Paylaşımı), AD-3 (Tek Veri Platformu — Supabase) kararlarını somutlaştırır. Bu story'de **iş mantığı (auth, arama, vb.) yoktur** — yalnızca üzerine inşa edilecek iskelet kurulur.

## Kapsam

- Monorepo yapısı: `apps/web`, `apps/mobile`, `apps/api`, `packages/shared` (bkz. `architecture.md` §12).
- `apps/web`: Next.js (App Router, TypeScript) placeholder ana sayfa.
- `apps/mobile`: React Native + Expo (TypeScript) placeholder ekran.
- `apps/api`: FastAPI (Python) iskeleti, `/health` endpoint'i.
- Supabase projesi oluşturulup backend'e bağlanması (yalnızca bağlantı — auth/tablo mantığı Story 1.2'de).
- Ortam değişkeni yönetimi (`.env.example` dosyaları, gizli anahtarların commit edilmemesi).
- Temel CI pipeline'ı (GitHub Actions): lint + build/typecheck her uygulama için.
- OpenAPI şemasının FastAPI tarafından otomatik üretilmesi (frontend tip üretimi pipeline'ının temeli, AD-2).
- Kök `README.md`: her uygulamanın yerel olarak nasıl çalıştırılacağı.

**Kapsam dışı:** Kullanıcı kaydı/girişi (Story 1.2), herhangi bir iş verisi modeli/tablosu, gerçek market data entegrasyonu, dağıtım (Vercel/Railway/EAS'a fiili deploy — bu story yalnızca yerel/CI'da çalışır durumu hedefler; prod deploy ayrı bir operasyonel adımdır).

## Kabul Kriterleri

**AC1 — Monorepo yapısı**
- **Given** proje kök dizini, **When** repo klonlanıp `pnpm install` çalıştırılırsa, **Then** `apps/web`, `apps/mobile`, `apps/api`, `packages/shared` dizinleri mevcuttur ve pnpm workspaces + Turborepo yapılandırması (`pnpm-workspace.yaml`, `turbo.json`) kök dizinde çalışır durumdadır.
- **And** `apps/api` Python tarafı olduğundan kendi bağımsız bağımlılık yönetimine (`pyproject.toml` + `uv` veya `poetry`) sahiptir; JS monorepo aracının parçası değildir ama aynı repo altında yaşar.

**AC2 — Web uygulaması ayağa kalkar**
- **Given** `apps/web` dizini, **When** `pnpm --filter web dev` çalıştırılırsa, **Then** Next.js geliştirme sunucusu başlar ve tarayıcıda "Borocean" yazan bir placeholder ana sayfa görüntülenir.
- **And** `pnpm --filter web build` hatasız tamamlanır (production build).

**AC3 — Mobil uygulama ayağa kalkar**
- **Given** `apps/mobile` dizini, **When** `pnpm --filter mobile start` (Expo) çalıştırılırsa, **Then** Expo geliştirme sunucusu başlar ve bir simülatör/Expo Go üzerinde "Borocean" yazan bir placeholder ekran görüntülenir.
- **And** TypeScript tip kontrolü (`tsc --noEmit`) hatasız geçer.

**AC4 — Backend API ayağa kalkar ve health-check verir**
- **Given** `apps/api` dizini, **When** `uvicorn app.main:app --reload` (veya eşdeğeri) çalıştırılırsa, **Then** `GET /health` endpoint'i `200 OK` ve `{"status": "ok"}` benzeri bir JSON döner.
- **And** FastAPI'nin otomatik ürettiği OpenAPI şeması `GET /openapi.json` üzerinden erişilebilir durumdadır (AD-2'nin ön koşulu).

**AC5 — Supabase bağlantısı**
- **Given** bir Supabase projesi oluşturulmuş ve bağlantı bilgileri ortam değişkeni olarak tanımlanmış, **When** `apps/api` başlatılırsa, **Then** backend Supabase PostgreSQL'e başarılı şekilde bağlanır (örn. basit bir `SELECT 1` sorgusuyla doğrulanan bir `/health/db` endpoint'i veya health endpoint'inin DB bağlantısını da kontrol etmesi).
- **And** bağlantı bilgileri (`SUPABASE_URL`, `SUPABASE_DB_URL`, `SUPABASE_ANON_KEY` vb.) kod içine gömülmez, yalnızca ortam değişkenlerinden okunur.

**AC6 — Ortam değişkeni yönetimi ve gizlilik**
- **Given** her uygulama (`web`, `mobile`, `api`), **When** repo incelenirse, **Then** her birinin kök dizininde gerekli değişkenleri örnekleyen bir `.env.example` dosyası bulunur, ama gerçek `.env` dosyaları `.gitignore` ile hariç tutulmuştur.
- **And** repo'da hiçbir gerçek API anahtarı/sır commit edilmemiştir (manuel kontrol + `git log` taraması ile doğrulanır).

**AC7 — CI pipeline**
- **Given** GitHub Actions yapılandırması, **When** bir pull request açılırsa, **Then** aşağıdaki adımlar otomatik çalışır ve hepsi yeşil (başarılı) olmadan PR birleştirilemez hale getirilir (branch protection önerilir, zorunlu değil bu story'de):
  - `web`: lint (ESLint) + typecheck + build
  - `mobile`: lint + typecheck
  - `api`: lint (ruff veya eşdeğeri) + varsa birim testleri (bu aşamada en az bir "smoke test" — `/health` endpoint'inin 200 döndüğünü doğrulayan bir test — yeterlidir)

**AC8 — Dokümantasyon**
- **Given** kök `README.md`, **When** bir geliştirici (ör. yeni katılan biri) dosyayı okursa, **Then** her üç uygulamayı yerel olarak nasıl çalıştıracağını (bağımlılık kurulumu, ortam değişkeni ayarı, çalıştırma komutu) adım adım bulur.

## Definition of Done

- [x] Tüm kabul kriterleri (AC1–AC8) sağlanıyor ve doğrulandı — *geriye dönük kapanış, 2026-09-26:* AC1 (`pnpm-workspace.yaml` + `turbo.json`, `apps/{web,mobile,api}` + `packages/shared`), AC2/AC4/AC5 (web ve API canlıda: Vercel + Render, `/health` ve `/health/db` üretimde çalışıyor), AC6 (üç uygulamada `.env.example` var, `.env`/`.env.local` `.gitignore`'da), AC7 (aşağıya bkz.), AC8 (`README.md` ve `README.en.md` üç uygulamanın kurulum/çalıştırma adımlarını içeriyor). **İstisna:** AC3'ün "simülatör/Expo Go üzerinde ekran" kısmı bu ortamda doğrulanamıyor (simülatör yok); mobil `tsc --noEmit` ve lint CI'da yeşil.
- [x] CI pipeline'ı main branch'te yeşil — iskeletten beri kırmızıydı (`LayoutProps` bulunamıyordu), 2026-09-26'da `next typegen && tsc` ile düzeltildi; `aac404f` dahil son koşular başarılı. Adımlar AC7 ile birebir: web lint+typecheck+build, mobil lint+typecheck, API ruff+pytest.
- [x] Hiçbir gizli anahtar repo'ya commit edilmedi — 2026-09-26'da tüm git geçmişi tarandı (Anthropic/Gemini/Resend/GitHub anahtar kalıpları, parolalı `postgresql://` URI'leri, Supabase JWT/secret anahtarları): eşleşme yok; hiçbir `.env`/`.env.local` dosyası geçmişte izlenmemiş.
- [x] `docs/architecture.md` §12'deki repo yapısıyla tutarlı (`apps/web`, `apps/mobile`, `apps/api`, `packages/shared`, `docs/`).
- [x] Sonraki story (1.2 — Kullanıcı Kaydı ve Girişi) bu iskelet üzerine doğrudan başlayabilir durumda — 1.2 ve sonrası bu iskelet üzerine tamamlandı.

## Teknik Notlar (Mimariden)

- Backend: Python + FastAPI (bkz. `architecture.md` §2, AD-1).
- Frontend/mobil: TypeScript, Next.js + React Native/Expo; ortak tipler ileride `packages/shared` altında OpenAPI'den üretilecek (AD-2) — bu story'de yalnızca pipeline'ın iskeleti (boş/placeholder script) yeterlidir, gerçek tip üretimi Story 1.2'den itibaren anlamlı hale gelir.
- Veri platformu: Supabase (yönetilen PostgreSQL + Auth) — bu story yalnızca bağlantıyı kurar, Auth entegrasyonu Story 1.2'nin kapsamındadır (AD-3).
- CI/CD: GitHub Actions; gerçek Vercel/Railway/EAS dağıtımı bu story'nin kapsamında değildir, ileride ayrı bir "deployment" görevi olarak ele alınmalıdır.
