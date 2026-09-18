-- Epic 8 — Abonelik ve Monetizasyon (Story 8.1: ücretsiz/premium katman ayrımı).
-- Story 8.2 (gerçek RevenueCat/Stripe satın alma akışı) HENÜZ kurulmadı — bu yüzden bu
-- tabloda bir satırı olmayan her kullanıcı 'free' sayılır (bkz. app/entitlements.py::get_tier).
-- Story 8.2 geldiğinde RevenueCat webhook'u bu tabloyu upsert edecek (AD-7).

create table if not exists entitlements (
    user_id uuid primary key references auth.users(id) on delete cascade,
    tier text not null default 'free' check (tier in ('free', 'premium')),
    updated_at timestamptz not null default now()
);

alter table entitlements enable row level security;
