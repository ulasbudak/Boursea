-- Story 5.3 — İndikatör/Sinyal Alarmı Kurma.
-- No migration framework is wired up yet (see docs/architecture.md §7 seed note); applied by hand for now.

create table if not exists signal_alerts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    symbol text not null,
    exchange text not null check (exchange in ('US', 'BIST')),
    name text,
    rule_id text not null,
    timeframe text not null default 'daily',
    status text not null default 'active' check (status in ('active', 'triggered')),
    created_at timestamptz not null default now(),
    triggered_at timestamptz
);

create index if not exists signal_alerts_user_id_idx on signal_alerts (user_id);

-- Our backend connects as the `postgres` role (BYPASSRLS), so this enforces nothing for it —
-- it's a fail-closed default in case Supabase's Data API is ever turned on for this project.
alter table signal_alerts enable row level security;
