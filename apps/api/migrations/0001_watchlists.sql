-- Story 5.1 — İzleme Listesi Oluşturma ve Yönetimi.
-- No migration framework is wired up yet (see docs/architecture.md §7 seed note); applied by hand for now.

create extension if not exists pgcrypto;

create table if not exists watchlists (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    created_at timestamptz not null default now()
);

create table if not exists watchlist_items (
    id uuid primary key default gen_random_uuid(),
    watchlist_id uuid not null references watchlists(id) on delete cascade,
    symbol text not null,
    exchange text not null check (exchange in ('US', 'BIST')),
    name text,
    note text,
    added_at timestamptz not null default now(),
    unique (watchlist_id, symbol, exchange)
);

create index if not exists watchlists_user_id_idx on watchlists (user_id);
create index if not exists watchlist_items_watchlist_id_idx on watchlist_items (watchlist_id);

-- Our backend connects as the `postgres` role (BYPASSRLS), so these enforce nothing for it —
-- they're a fail-closed default in case Supabase's Data API is ever turned on for this project.
alter table watchlists enable row level security;
alter table watchlist_items enable row level security;
