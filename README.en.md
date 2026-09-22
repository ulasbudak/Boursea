# Boursea

*This is the English translation of [`README.md`](README.md), which remains the source of truth.*

A stock-tracking app that evaluates stocks on the American (NYSE/NASDAQ) and Turkish (BIST) exchanges using fundamental and technical analysis parameters.

Related documents (English / [Türkçe](README.md)): [`docs/PRD.en.md`](docs/PRD.en.md) ([TR](docs/PRD.md)), [`docs/architecture.en.md`](docs/architecture.en.md) ([TR](docs/architecture.md)), [`docs/epics.en.md`](docs/epics.en.md) ([TR](docs/epics.md)), [`docs/product-brief-epic9-ai.en.md`](docs/product-brief-epic9-ai.en.md) ([TR](docs/product-brief-epic9-ai.md)).

The Turkish documents are the source of truth; the English versions are kept in sync on every update. See [`LICENSE`](LICENSE) — this project is closed-source, all rights reserved.

## Monorepo Structure

```
apps/
  web/      # Next.js (TypeScript) web app
  mobile/   # React Native / Expo (TypeScript) mobile app
  api/      # FastAPI (Python) backend
packages/
  shared/   # Shared TS types generated from the backend OpenAPI schema
```

## Prerequisites

- Node.js 24+
- [pnpm](https://pnpm.io/) 12+ (`npm install -g pnpm`)
- Python 3.11+
- A [Supabase](https://supabase.com) project (PostgreSQL + Auth) — grab the project URL and **Publishable Key** from [API Settings](https://supabase.com/dashboard/project/_/settings/api). To enable Google/Apple login, turn on the relevant providers under [Auth Providers](https://supabase.com/dashboard/project/_/auth/providers) (for web; native Google/Apple login isn't supported on mobile yet, see `docs/stories/story-1.2.md`).

## Web (`apps/web`)

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local  # fill in the NEXT_PUBLIC_SUPABASE_* values
pnpm --filter web dev       # http://localhost:3000 — sign up/log in from the /login page
pnpm --filter web build     # production build
pnpm --filter web typecheck
pnpm --filter web lint
```

## Mobile (`apps/mobile`)

```bash
pnpm install
cp apps/mobile/.env.example apps/mobile/.env  # fill in the EXPO_PUBLIC_SUPABASE_* values
pnpm --filter mobile start   # Expo dev server, opens in Expo Go or a simulator via QR code — a sign-up/login screen appears
pnpm --filter mobile typecheck
pnpm --filter mobile lint
```

## Backend API (`apps/api`)

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env             # fill in SUPABASE_*, FINNHUB_API_KEY
uvicorn app.main:app --reload    # http://localhost:8000
```

The API also runs without `FINNHUB_API_KEY` — only US stock search is disabled, and the response explicitly states this in the `warnings` field (BIST search always works via the static directory). A free key is available from [finnhub.io](https://finnhub.io/register).

Verification:

- `GET /health` → `{"status": "ok"}`
- `GET /health/db` → `{"status": "ok"}` if the Supabase Postgres connection is set up, otherwise `503` with `{"status": "unavailable"}`
- `GET /symbols/search?q=GARAN` → BIST/US symbol search
- `GET /openapi.json` → the OpenAPI schema

Tests and lint:

```bash
pytest -q
ruff check .
```

## Running the Whole Workspace at Once

From the root directory, `turbo` can trigger the same command across all JS/TS apps (the backend is separate, being Python-based, so it's out of scope here):

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## CI

`.github/workflows/ci.yml` automatically runs web/mobile lint+typecheck(+build) and backend ruff+pytest checks on every pull request.
