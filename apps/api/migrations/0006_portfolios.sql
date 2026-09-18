-- Epic 6 — Portföy Takibi (Story 6.1/6.2/6.3: portföy+pozisyon CRUD, çoklu portföy).
-- Same pattern as 0001-0005: applied by hand, RLS enabled as a fail-closed default only
-- (backend connects as `postgres`, which bypasses RLS; see 0001_watchlists.sql notes).

create table if not exists portfolios (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    created_at timestamptz not null default now()
);

create table if not exists positions (
    id uuid primary key default gen_random_uuid(),
    portfolio_id uuid not null references portfolios(id) on delete cascade,
    symbol text not null,
    exchange text not null check (exchange in ('US', 'BIST')),
    name text,
    quantity numeric not null check (quantity > 0),
    avg_cost numeric not null check (avg_cost > 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (portfolio_id, symbol, exchange)
);

create index if not exists portfolios_user_id_idx on portfolios (user_id);
create index if not exists positions_portfolio_id_idx on positions (portfolio_id);

alter table portfolios enable row level security;
alter table positions enable row level security;
