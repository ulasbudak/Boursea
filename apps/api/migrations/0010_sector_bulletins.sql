-- Epic 9 — günlük sektör bülteni (premium, kullanıcı isteği 2026-09-18/19).
-- ai_reports'tan kasıtlı olarak farklı bir desen: ai_reports tek-satır upsert-cache
-- (ON CONFLICT DO UPDATE, üzerine yazar); bu tablo APPEND-ONLY bir arşiv — her gün
-- için tek bir satır eklenir, hiçbir satır asla silinmez/güncellenmez.

create table if not exists sector_bulletins (
    id bigint generated always as identity primary key,
    bulletin_date date not null unique,
    sector text not null,
    picks jsonb not null,
    content text not null,
    created_at timestamptz not null default now()
);

alter table sector_bulletins enable row level security;
