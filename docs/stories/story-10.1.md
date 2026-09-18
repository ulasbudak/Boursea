---
title: "Story 10.1: Bütçeli Simülasyon Oluşturma ve Emir Yürütme"
epic: "Epic 10 — Alım-Satım Simülasyonu (Paper Trading)"
story_id: "10.1"
status: done
created: 2026-09-19
updated: 2026-09-19
author: Bob (BMAD Scrum Master) & Amelia (BMAD Developer)
based_on: ["docs/PRD.md §5.12", "docs/epics.md §14"]
depends_on: ["6.1", "6.2", "8.1"]
---

# Story 10.1: Bütçeli Simülasyon Oluşturma ve Emir Yürütme

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want gerçek piyasa verisiyle, kendi belirlediğim bir bütçeyle sanal alım-satım yapmak,
So that gerçek para riskine girmeden stratejimi test edip zaman içindeki performansımı görebileyim.

*(Kaynak: kullanıcı isteği, 2026-09-19; PRD FR-110/111/112.)*

## Bağlam

Bu, önceden PRD/epics.md'de hiç bahsedilmemiş, tamamen yeni bir kapsam. Mevcut **Portföy** özelliğinden (Story 6.1-6.3, `app/portfolios.py`) kasıtlı olarak farklı:

| | Portföy | Simülasyon |
|---|---|---|
| Amaç | Gerçekten sahip olunan pozisyonları kaydetmek | Sanal bütçeyle alım-satım denemek |
| Fiyat | Kullanıcı elle girer (gerçek geçmiş alımını kaydeder) | Backend, o anki gerçek piyasa fiyatını çekip emri bu fiyattan yürütür |
| Bütçe/nakit kısıtı | Yok | Var — alış, nakit bakiyesini aşamaz |
| Pozisyon silme | Doğrudan silinebilir | Yok — yalnızca satım emriyle kapatılır (nakit tutarlılığı için) |
| Kapsam | US + BIST (BIST'te fiyat yok ama pozisyon kaydedilebilir) | Yalnızca US (emir yürütmek için gerçek fiyat şart) |

**Zamanlama kararı (Story 9.3 ile aynı gerekçe):** Projede hiçbir zaman bir cron/Celery altyapısı kurulmadı. Günlük P&L geçmişi, Story 9.3'ün bültenlerindeki "istek anında üret" felsefesiyle üretiliyor — ama bültenlerden farklı olarak **bugünün satırı upsert edilir** (bültenler yazılıp bir daha değişmiyordu; simülasyonda nakit/pozisyon değeri gün içinde birden fazla kez değişebilir). Yalnızca geçmiş günlerin satırları donuyor.

**Emir yürütme modeli:** "Gerçek veriyle alım satım" isteğini gerçek anlamda karşılamak için, kullanıcı fiyat girmiyor — yalnızca sembol+miktar+yön giriyor, backend `get_us_overview()` (Portföy'ün `value_portfolios()`'ta zaten kullandığı fonksiyon) ile o anki gerçek fiyatı çekip emri yürütüyor. Bu hem gerçekçi hem de kullanıcının uydurma fiyat girip simülasyonu anlamsızlaştırmasını engelliyor.

## Kapsam

- **Backend:**
  - `apps/api/migrations/0011_simulations.sql` — `simulations` (bütçe+nakit), `simulation_positions` (Portföy'ün `positions`'ıyla aynı şema), `simulation_snapshots` (günlük, upsert edilebilir tek satır) tabloları.
  - `app/simulations.py`: `list_simulations`, `create_simulation`, `delete_simulation`, `place_order` (canlı fiyat + bütçe/miktar kontrolü + weighted-average, Portföy'ün `add_transaction()`'ıyla aynı muhasebe mantığı), `value_simulations` (Portföy'ün `value_portfolios()` deseni), `save_todays_snapshot` (upsert), `list_snapshots`, `get_history`.
  - `app/entitlements.py`: `FREE_SIMULATION_LIMIT = 1`, `Entitlement.simulation_limit`, `enforce_simulation_limit()` — Portföy'ün `enforce_portfolio_limit()` ile birebir aynı desen.
  - `app/main.py`: `GET/POST /simulations`, `DELETE /simulations/{id}`, `POST /simulations/{id}/orders`, `GET /simulations/{id}/history`.
- **Web/Mobil:** Yeni bir `/simulation` sayfası/ekranı — Portföy'ün arayüz deseniyle aynı (simülasyon kartları, pozisyon tablosu) ama emir formunda fiyat alanı **yok** (sembol/borsa/yön/miktar), ve `MiniBarChart` (fundamentals'ın geçmiş performans grafiğinden tekrar kullanılan bağımlılıksız bar grafiği) ile günlük P&L gösterimi. Dashboard'a yeni bir Quick Access girişi.

**Kapsam dışı:**
- Gerçek alım-satım emri iletimi / aracı kurum entegrasyonu — bu, PRD §10'da zaten kapsam dışı; simülasyon bunun bir istisnası değil, tamamen sanal.
- BIST hisseleri — canlı fiyat kaynağı yok, emir yürütülemez.
- Pozisyonu doğrudan silme — yalnızca tam miktar satım emriyle kapatma.
- Birden fazla para birimi/döviz kuru — yalnızca USD.

## Görevler

1. **[Backend]** `apps/api/migrations/0011_simulations.sql`. ✅ — canlı Supabase'e uygulandı.
2. **[Backend]** `app/simulations.py`: CRUD + emir yürütme + değerleme + günlük snapshot. ✅
3. **[Backend]** `app/entitlements.py`: `FREE_SIMULATION_LIMIT`, `enforce_simulation_limit()`. ✅
4. **[Backend]** `GET/POST /simulations`, `DELETE /simulations/{id}`, `POST /simulations/{id}/orders`, `GET /simulations/{id}/history` (`main.py`). ✅
5. **[Backend]** Testler: weighted-average, yetersiz bütçe/miktar reddi, canlı fiyat mock'lanarak emir yürütme, BIST reddi, günlük snapshot upsert, entitlement 403/401. ✅ (311/311 test yeşil, ruff temiz.)
6. **[Web]** `/simulation` sayfası + emir formu + günlük P&L bar grafiği + dashboard nav girişi. ✅
7. **[Mobil]** `SimulationScreen` + `HomeScreen`'e nav kartı. ✅

## Kabul Kriterleri

**AC1 — Gerçek fiyattan emir yürütme**
- **Given** bir kullanıcı bir başlangıç bütçesiyle simülasyon oluşturur, **When** bir sembol için alım/satım emri verirse, **Then** emir kullanıcının girdiği değil **o anki gerçek piyasa fiyatından** yürütülür; nakit bakiyesi buna göre güncellenir.

**AC2 — Bütçe/miktar kısıtı**
- **Given** bir alım emrinin maliyeti mevcut nakit bakiyesini aşıyorsa, **When** emir verilirse, **Then** emir reddedilir ve nakit/pozisyon değişmez. Aynı şekilde elde tutulan miktarı aşan bir satım emri de reddedilir.

**AC3 — Günlük kâr/zarar geçmişi**
- **Given** bir simülasyon, **When** kullanıcı zaman içindeki performansına bakarsa, **Then** günlük toplam değer (nakit + pozisyon değeri) ve kâr/zarar geçmişi gösterilir; geçmiş günlerin kayıtları bir daha değişmez, yalnızca bugünün kaydı güncellenir.

**AC4 — Kapsam sınırları ve freemium**
- **And** yalnızca ABD hisseleri desteklenir; ücretsiz katman 1 simülasyonla sınırlıdır, backend bunu zorlar (403); premium sınırsızdır.

## Definition of Done

- [x] AC1, AC2, AC4 koda yazıldı ve mock'lu testlerle doğrulandı.
- [x] Migration canlı Supabase'e uygulandı.
- [x] Backend testleri yeşil + ruff temiz (311/311).
- [x] Web: typecheck, lint, build yeşil.
- [x] Mobil: typecheck, lint, Metro bundle yeşil.
- [x] **Gerçek bir sembolle canlı uçtan uca doğrulandı** — gerçek AAPL fiyatı (336.13) referans alındı, 5 adet alım emri tam bu fiyattan yürütüldü (`avg_cost`/`current_price` birebir eşleşti), nakit bakiyesi doğru düştü (10000 → 8319.35). Bütçeyi aşan alım 400 ile reddedildi; elde tutulandan fazla satım 400 ile reddedildi; BIST emri 503 ile reddedildi. `GET .../history` art arda iki kez çağrılıp aynı `snapshot_date` için aynı satırın güncellendiği (yeni satır eklenmediği) doğrulandı. Test verisi (simülasyon, kademeli cascade ile pozisyon+snapshot dahil) temizlendi.
- [x] **Ücretsiz katmanda 2. simülasyonun 403 aldığı canlı doğrulandı** — gerçek JWT ile ilk simülasyon 201, ikinci deneme "Ücretsiz katmanda en fazla 1 simülasyon oluşturabilirsin" mesajıyla 403.
- [ ] Gerçek tarayıcıda/cihazda görsel doğrulama — kullanıcı bizzat denemeli.

## Teknik Notlar

- **Muhasebe mantığı Portföy'le birebir aynı:** weighted-average maliyet hesaplaması, tam satımda pozisyonun silinmesi, `unique(simulation_id, symbol, exchange)` kısıtı — `app/portfolios.py::add_transaction()`'dan doğrudan uyarlandı, yeni bir muhasebe modeli icat edilmedi.
- **`value_simulations()` Portföy'ün `value_portfolios()`'undan daha basit:** tüm simülasyon pozisyonları US olduğundan (BIST emir reddediliyor), yalnızca "fiyat geçici olarak alınamadı" durumunu ele alıyor, Portföy'deki BIST dalı yok.
- **Günlük snapshot upsert, Story 9.3'ten farklı:** Bültenler yazılıp bir daha değişmiyordu (`ON CONFLICT DO NOTHING`); burada bugünün satırı her emirden/sayfa açılışından sonra yeniden hesaplanabilir (`ON CONFLICT (simulation_id, snapshot_date) DO UPDATE`) — yalnızca geçmiş günler donuyor.
- **Bilinen sınırlama:** Bir günün son değeri, kullanıcının o gün uygulamayı son açtığı/işlem yaptığı andaki değeri yansıtır, günsonu kapanış fiyatı değil (cron olmadığı için) — Story 9.3'teki aynı sınırlama.
