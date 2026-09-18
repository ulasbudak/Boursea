-- Alım-satım simülasyonu (paper trading) — kullanıcı isteği, 2026-09-19. Portföy'den
-- (0006_portfolios.sql) kasıtlı olarak ayrı: burada bir nakit bütçesi var ve emirler
-- gerçek anlık fiyattan otomatik yürütülüyor (elle fiyat girişi yok).
--
-- simulation_snapshots, Story 9.3'ün sector_bulletins'iyle aynı "günlük tek satır" deseninde
-- ama append-only DEĞİL — bugünün satırı gün içinde yeniden hesaplanıp upsert edilebilir
-- (her emirden veya sayfa açılışından sonra); yalnızca geçmiş günlerin satırları donuyor.

create table if not exists simulations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    starting_budget numeric not null check (starting_budget > 0),
    cash_balance numeric not null,
    created_at timestamptz not null default now()
);

create table if not exists simulation_positions (
    id uuid primary key default gen_random_uuid(),
    simulation_id uuid not null references simulations(id) on delete cascade,
    symbol text not null,
    exchange text not null check (exchange in ('US', 'BIST')),
    name text,
    quantity numeric not null check (quantity > 0),
    avg_cost numeric not null check (avg_cost > 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (simulation_id, symbol, exchange)
);

create table if not exists simulation_snapshots (
    id bigint generated always as identity primary key,
    simulation_id uuid not null references simulations(id) on delete cascade,
    snapshot_date date not null,
    cash_balance numeric not null,
    positions_value numeric not null,
    total_equity numeric not null,
    pnl_abs numeric not null,
    pnl_pct numeric,
    created_at timestamptz not null default now(),
    unique (simulation_id, snapshot_date)
);

create index if not exists simulations_user_id_idx on simulations (user_id);
create index if not exists simulation_positions_simulation_id_idx on simulation_positions (simulation_id);
create index if not exists simulation_snapshots_simulation_id_idx on simulation_snapshots (simulation_id);

alter table simulations enable row level security;
alter table simulation_positions enable row level security;
alter table simulation_snapshots enable row level security;
