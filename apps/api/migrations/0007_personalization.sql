-- Epic 7 — Kişiselleştirme (Story 7.2: hisseye kişisel not).
-- Story 7.1 (ilgi profili) yeni bir tablo gerektirmiyor — Story 1.3'teki dil tercihi
-- kararıyla aynı desen: `interest_sectors` Supabase Auth `user_metadata`'sında saklanıyor
-- (JWT claim'i olarak zaten backend'e ulaşıyor, ayrı bir sorgu/tablo gerekmiyor).
-- Same pattern as 0001-0006: applied by hand, RLS enabled as a fail-closed default only.

create table if not exists stock_notes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    symbol text not null,
    exchange text not null check (exchange in ('US', 'BIST')),
    note text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, symbol, exchange)
);

create index if not exists stock_notes_user_id_idx on stock_notes (user_id);

alter table stock_notes enable row level security;
