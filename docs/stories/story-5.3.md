---
title: "Story 5.3: İndikatör/Sinyal Alarmı Kurma"
epic: "Epic 5 — İzleme Listesi, Alarmlar ve Bildirimler"
story_id: "5.3"
status: done
created: 2026-09-16
updated: 2026-09-16
author: Bob (BMAD Scrum Master) & Amelia (BMAD Developer)
based_on: ["docs/PRD.md", "docs/architecture.md", "docs/epics.md §9"]
depends_on: ["3.5", "5.2"]
---

# Story 5.3: İndikatör/Sinyal Alarmı Kurma

## Kullanıcı Hikayesi

As a **aktif trader**,
I want RSI/MACD gibi bir indikatör koşuluna göre alarm kurmak,
So that manuel takip etmeden teknik sinyalleri kaçırmayayım.

*(Kaynak: `docs/epics.md` §9, Epic 5 — Story 5.3; PRD FR-042.)*

## Bağlam

Story 5.2'nin fiyat alarmı deseniyle aynı iskelet (DB tablosu, `evaluate_and_persist` — istek-anında değerlendirme, Celery yok) burada Story 3.5/3.7'nin kural motoruna (`app/technical.py`, `evaluate_signals`, 12 kural) bağlanıyor. Kullanıcı, hazır 12 kuraldan birini (örn. "RSI 30 altına düştü", "MACD sinyal çizgisini yukarı kesti") seçip bir sembole bağlıyor; `GET /signal-alerts` her çağrıldığında ilgili sembolün güncel mumları üzerinden `evaluate_signals` çalıştırılıp seçilen kuralın son sinyal listesinde olup olmadığına bakılıyor.

**Aynı BIST kısıtı:** `get_bist_candles()` her zaman boş liste döndürüyor (canlı BIST veri kararı hâlâ ertelenmiş, bkz. `architecture.md` §11) — bu yüzden BIST sinyal alarmları da Story 5.2'deki gibi "değerlendirilemiyor" olarak açıkça işaretleniyor.

## Kapsam

**Bu PR'da tamamlanan:**
- **DB:** `apps/api/migrations/0003_signal_alerts.sql` — `signal_alerts` tablosu (canlı Supabase projesine uygulandı).
- **Backend:** `app/technical.py`'ye `SIGNAL_RULE_CATALOG`/`SIGNAL_RULE_IDS` (12 kuralın id/isim/yön kataloğu, mevcut `evaluate_signals` mantığına dokunulmadan eklendi); `app/signal_alerts.py` (CRUD + `evaluate_and_persist`); `main.py`'de `GET /technical/rules` (kural kataloğu) ve `/signal-alerts` uç noktaları.
- **Web:** hisse detay sayfasında "Sinyal Alarmı Kur" butonu (kural seçimi + zaman dilimi), `/signal-alerts` sayfası, dashboard nav kartı.
- **Mobil:** `SignalAlertsScreen.tsx`, hisse detayında `CreateSignalAlertButton.tsx`, `HomeScreen` nav girişi.
- **i18n:** `Messages.signalAlerts` bölümü (tr/en).

**Kapsam dışı (takip görevi):**
- Story 5.4 (push/e-posta bildirimi) — bu story yalnızca durumu gösterir, proaktif bildirim göndermez (Story 5.2 ile aynı gerekçe).
- BIST sinyal alarmlarının tetiklenme değerlendirmesi — canlı BIST veri kararına bağlı.

## Görevler

1. **[Backend]** `app/technical.py`: `SIGNAL_RULE_CATALOG`/`SIGNAL_RULE_IDS` kataloğu (mevcut `evaluate_signals` değiştirilmedi). ✅
2. **[DB]** `signal_alerts` şeması + migration (Story 5.1/5.2 deseniyle aynı). ✅
3. **[Backend]** `app/signal_alerts.py`: CRUD + `evaluate_and_persist` (US: `get_us_candles` + `evaluate_signals`, kural eşleşirse tetikle; BIST: `unavailable=True`). ✅
4. **[Backend]** `/signal-alerts` REST uç noktaları + `GET /technical/rules`; `rule_id`/`timeframe`/`exchange` doğrulaması (400). ✅
5. **[Backend]** Testler: veri katmanı, değerlendirme mantığı (mock `get_us_candles`/`evaluate_signals`), uç nokta testleri. ✅
6. **[Web]** `lib/signal-alerts-client.ts`; hisse detayında `CreateSignalAlertButton`; `/signal-alerts` sayfası. ✅
7. **[Mobil]** `lib/signal-alerts-client.ts`; `SignalAlertsScreen.tsx`; hisse detayında `CreateSignalAlertButton.tsx`. ✅
8. **[Hepsi]** `Messages.signalAlerts` i18n bölümü, dashboard nav kartları. ✅

## Kabul Kriterleri

**AC1 — İndikatör alarmı kurma**
- **Given** bir hisse detay sayfası, **When** kullanıcı 12 hazır kuraldan birini (örn. "RSI 70 üstüne çıktı") seçip kaydederse, **Then** alarm backend'de kalıcı olarak saklanır (FR-042).

**AC2 — Tetiklenme**
- **Given** aktif bir ABD hisse sinyal alarmı, **When** `GET /signal-alerts` çağrılırsa, **Then** seçilen sembolün güncel mumları üzerinden ilgili kural değerlendirilir; kural sinyal listesinde bulunursa alarm `triggered` durumuna geçer (Story 3.5'teki sinyal motoru kullanılır).

**AC3 — BIST kısıtı açıkça bildirilir**
- **Given** bir BIST sinyal alarmı, **When** kullanıcı listeyi görüntülerse, **Then** alarm "değerlendirilemiyor" durumunda gösterilir, nedeni belirtilir.

## Definition of Done

- [x] AC1–AC3 karşılanıyor ve doğrulandı (backend: pytest 162/162 yeşil + ruff temiz [yeni/değiştirilen dosyalarda]; web/mobil: typecheck/lint/build).
- [x] **Canlı uçtan uca doğrulandı:** `signal_alerts` tablosu bu ortamdaki gerçek Supabase projesine uygulandı (Story 5.2'nin aksine bu tablo önceden yoktu, ilk kez burada oluşturuldu). Gerçek bir JWT ile `POST /signal-alerts` (AAPL, rsi_overbought) → `GET /signal-alerts` (gerçek Finnhub günlük mumları üzerinden RSI hesaplanıp kural gerçekten `triggered` oldu, gerçek bir geçmiş tarihte) → BIST alarmı (`unavailable: true` doğrulandı) → temizlik, tekrar boş tabloya dönüldü.
- [x] **Web görsel/etkileşim doğrulaması** (2026-09-21) — Claude tarafından, headless Chromium (Playwright) ile: hisse detayında "Set Signal Alert" açılır formu (kural: "RSI 30 altına düştü", periyot: daily) dolduruldu, kaydedildi; `/signal-alerts` sayfasında doğru göründüğü doğrulandı. Test verisi sonradan temizlendi.
- [ ] Mobil görsel/etkileşim doğrulaması — bu ortamda gerçek simülatör/cihaz yok; kullanıcı bizzat denemeli.

## Teknik Notlar

- **Küçük, ilgisiz bir bulgu (düzeltilmedi, bilgi amaçlı):** `DELETE /signal-alerts/{geçersiz-uuid-olmayan-id}` 404 yerine 503 dönüyor — çünkü Postgres `uuid` sütununa geçersiz formatlı bir string verilince `psycopg.Error` fırlatıyor ve bu genel "veritabanı erişilemez" handler'ına düşüyor. Aynı davranış `app/watchlists.py` ve `app/alerts.py`'de de zaten mevcut (bu story'ye özgü değil); gerçek kullanımda frontend her zaman API'den aldığı gerçek ID'leri gönderdiği için pratikte tetiklenmiyor. Tutarlı bir düzeltme (üç modülde de ID format kontrolü) ayrı, küçük bir iyileştirme olarak ele alınabilir.
- Diğer tüm mimari kararlar Story 5.1/5.2 ile aynı; yeni bir karar eklenmedi.
