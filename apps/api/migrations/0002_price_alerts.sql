-- Story 5.2 — Fiyat Alarmı Kurma.
-- No migration framework is wired up yet (see docs/architecture.md §7 seed note); applied by hand for now.

create table if not exists price_alerts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    symbol text not null,
    exchange text not null check (exchange in ('US', 'BIST')),
    name text,
    direction text not null check (direction in ('above', 'below')),
    threshold numeric not null,
    status text not null default 'active' check (status in ('active', 'triggered')),
    created_at timestamptz not null default now(),
    triggered_at timestamptz
);

create index if not exists price_alerts_user_id_idx on price_alerts (user_id);

-- Our backend connects as the `postgres` role (BYPASSRLS), so this enforces nothing for it —
-- it's a fail-closed default in case Supabase's Data API is ever turned on for this project.
alter table price_alerts enable row level security;
