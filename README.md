# Trendus

Amerikan (NYSE/NASDAQ) ve Türkiye (BIST) borsalarındaki hisseleri temel ve teknik analiz parametreleriyle değerlendiren bir borsa takip uygulaması.

İlgili dokümanlar: [`docs/PRD.md`](docs/PRD.md), [`docs/architecture.md`](docs/architecture.md), [`docs/epics.md`](docs/epics.md).

## Monorepo Yapısı

```
apps/
  web/      # Next.js (TypeScript) web uygulaması
  mobile/   # React Native / Expo (TypeScript) mobil uygulaması
  api/      # FastAPI (Python) backend
packages/
  shared/   # Backend OpenAPI şemasından üretilecek paylaşımlı TS tipleri
```

## Ön Koşullar

- Node.js 24+
- [pnpm](https://pnpm.io/) 12+ (`npm install -g pnpm`)
- Python 3.11+
- Bir [Supabase](https://supabase.com) projesi (PostgreSQL + Auth) — Proje URL'si ve **Publishable Key**'i [API Settings](https://supabase.com/dashboard/project/_/settings/api) sayfasından alın. Google/Apple ile giriş için ilgili sağlayıcıları [Auth Providers](https://supabase.com/dashboard/project/_/auth/providers) altında etkinleştirin (web için; mobilde native Google/Apple girişi henüz desteklenmiyor, bkz. `docs/stories/story-1.2.md`).

## Web (`apps/web`)

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local  # NEXT_PUBLIC_SUPABASE_* değerlerini doldurun
pnpm --filter web dev       # http://localhost:3000 — /login sayfasından kayıt/giriş yapılabilir
pnpm --filter web build     # production build
pnpm --filter web typecheck
pnpm --filter web lint
```

## Mobil (`apps/mobile`)

```bash
pnpm install
cp apps/mobile/.env.example apps/mobile/.env  # EXPO_PUBLIC_SUPABASE_* değerlerini doldurun
pnpm --filter mobile start   # Expo geliştirme sunucusu, QR kod ile Expo Go veya simülatörde açılır — e-posta/şifre ile kayıt/giriş ekranı açılır
pnpm --filter mobile typecheck
pnpm --filter mobile lint
```

## Backend API (`apps/api`)

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env             # SUPABASE_*, FINNHUB_API_KEY değerlerini doldurun
uvicorn app.main:app --reload    # http://localhost:8000
```

`FINNHUB_API_KEY` olmadan da API çalışır — yalnızca ABD hisse araması devre dışı kalır ve yanıt bunu `warnings` alanında açıkça belirtir (BIST araması statik bir dizinle her koşulda çalışır). Ücretsiz bir anahtar [finnhub.io](https://finnhub.io/register)'dan alınabilir.

Doğrulama:

- `GET /health` → `{"status": "ok"}`
- `GET /health/db` → Supabase Postgres bağlantısı kuruluysa `{"status": "ok"}`, değilse `503` ile `{"status": "unavailable"}`
- `GET /symbols/search?q=GARAN` → BIST/ABD sembol araması
- `GET /openapi.json` → OpenAPI şeması

Test ve lint:

```bash
pytest -q
ruff check .
```

## Tüm Workspace'i Birden Çalıştırma

Kök dizinden `turbo` ile tüm JS/TS uygulamaları için aynı komutu tetikleyebilirsiniz (backend ayrı, Python tabanlı olduğu için kapsam dışıdır):

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## CI

`.github/workflows/ci.yml`, her pull request'te web/mobile lint+typecheck(+build) ve backend ruff+pytest kontrollerini otomatik çalıştırır.
