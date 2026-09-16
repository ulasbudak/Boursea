-- Story 5.4 — Alarm Bildirimleri (Push ve E-posta).
-- No migration framework is wired up yet (see docs/architecture.md §7 seed note); applied by hand for now.

create table if not exists user_notification_settings (
    user_id uuid primary key references auth.users(id) on delete cascade,
    expo_push_token text,
    push_enabled boolean not null default true,
    email_enabled boolean not null default true,
    updated_at timestamptz not null default now()
);

-- Our backend connects as the `postgres` role (BYPASSRLS), so this enforces nothing for it —
-- it's a fail-closed default in case Supabase's Data API is ever turned on for this project.
alter table user_notification_settings enable row level security;
