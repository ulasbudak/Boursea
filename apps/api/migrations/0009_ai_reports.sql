-- Epic 9 — AI Destekli Analiz (Story 9.1: temel analiz AI raporu, Story 9.2: teknik analiz AI raporu).
-- Sembol+borsa+rapor-türü bazlı GLOBAL önbellek (kullanıcı bazlı değil) — aynı hisseye bakan
-- farklı kullanıcılar aynı raporu paylaşır, bu da LLM API / CV inference maliyetini kontrol eder.
-- TTL uygulama katmanında yorumlanır (generated_at üzerinden); bu tabloda bir expiry sütunu yok.

create table if not exists ai_reports (
    id bigint generated always as identity primary key,
    symbol text not null,
    exchange text not null,
    report_type text not null check (report_type in ('fundamental', 'technical')),
    content jsonb not null,
    generated_at timestamptz not null default now(),
    unique (symbol, exchange, report_type)
);

alter table ai_reports enable row level security;
