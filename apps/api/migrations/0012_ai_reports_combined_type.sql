-- AI Analiz sekmesinde temel + teknik raporları sentezleyen "ortak değerlendirme" raporu
-- (app/ai_combined.py) — kullanıcı isteği, 2026-09-19. 0009_ai_reports.sql'in report_type
-- check kısıtına yeni değeri ekliyor; şema/altyapı aynı, yalnızca izin verilen değer seti genişliyor.

alter table ai_reports drop constraint ai_reports_report_type_check;
alter table ai_reports add constraint ai_reports_report_type_check
    check (report_type in ('fundamental', 'technical', 'combined'));
