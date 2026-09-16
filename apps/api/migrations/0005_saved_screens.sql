-- Story 4.2 — Kayıtlı Taramalar.
-- No migration framework is wired up yet (see docs/architecture.md §7 seed note); applied by hand for now.

create table if not exists saved_screens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    criteria jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists saved_screens_user_id_idx on saved_screens (user_id);

-- Our backend connects as the `postgres` role (BYPASSRLS), so this enforces nothing for it —
-- it's a fail-closed default in case Supabase's Data API is ever turned on for this project.
alter table saved_screens enable row level security;
