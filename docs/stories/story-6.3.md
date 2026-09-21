---
title: "Story 6.3: Çoklu Portföy Desteği"
epic: "Epic 6 — Portföy Takibi"
story_id: "6.3"
status: done
created: 2026-09-18
updated: 2026-09-18
author: Bob (BMAD Scrum Master) & Amelia (BMAD Developer)
based_on: ["docs/PRD.md", "docs/architecture.md §7", "docs/epics.md §10"]
depends_on: ["6.1"]
---

# Story 6.3: Çoklu Portföy Desteği

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want birden fazla portföy (örn. "ABD hisseleri", "BIST uzun vade") oluşturmak,
So that farklı yatırım stratejilerimi ayrı ayrı takip edebileyim.

*(Kaynak: `docs/epics.md` §10, Epic 6 — Story 6.3; PRD FR-052.)*

## Bağlam

Bu story ayrı bir görev seti gerektirmedi çünkü Story 6.1'in şeması (`portfolios` → `positions`, `portfolio_id` FK) **baştan** çoklu-portföyü destekleyecek şekilde tasarlandı — Story 5.1'in `watchlists` → `watchlist_items` desenindeki "önce tek liste sonra çoğullaştır" yerine "baştan çoğul" kararının birebir aynısı. Tek bir kullanıcı kaç portföy isterse o kadar oluşturabilir; "varsayılan portföy" gibi özel bir kavram yok, tıpkı watchlist'te olduğu gibi.

## Kapsam

**Bu PR'da tamamlanan (Story 6.1 ile aynı PR/commit'te):**
- Backend: `list_portfolios(user_id)` kullanıcının **tüm** portföylerini (her biri kendi pozisyonlarıyla) döndürür; `create_portfolio`/`delete_portfolio` sınırsız sayıda portföy oluşturma/silmeyi destekler.
- Web/Mobil: `/portfolio` sayfası ve `PortfolioScreen`, birden fazla portföyü art arda kart olarak listeler; her kart kendi toplam değeri/kâr-zararıyla bağımsız gösterilir.

**Kapsam dışı:**
- Portföyler arası pozisyon taşıma/kopyalama.
- Portföy yeniden adlandırma (yalnızca oluşturma/silme var — Story 5.1'deki watchlist'lerle aynı kısıt).

## Görevler

1. **[Backend]** Şemanın/CRUD'un baştan çoklu-portföyü desteklemesi (ayrı bir görev gerekmedi, bkz. Bağlam). ✅
2. **[Web]** `/portfolio` sayfasında birden fazla portföyün kart listesi olarak gösterimi. ✅
3. **[Mobil]** `PortfolioScreen`'de aynı liste deseni. ✅

## Kabul Kriterleri

**AC1 — Yeni portföy oluşturma**
- **Given** portföy yönetimi ekranı, **When** kullanıcı yeni bir portföy oluşturursa, **Then** istediği isimle ayrı bir portföy açılır (FR-052).

**AC2 — Bağımsız gösterim**
- **Given** birden fazla portföy, **When** kullanıcı ekranı görüntülerse, **Then** her portföyün kendi pozisyonları ve toplamı ayrı gösterilir (ekranlar arası "geçiş" değil, hepsi aynı sayfada kart listesi olarak — watchlist'teki tasarım kararıyla tutarlı).

## Definition of Done

- [x] AC1–AC2 karşılanıyor ve doğrulandı — canlı smoke test'te tek bir portföy oluşturulup test edildi (bkz. `story-6.1.md`); çoklu-portföy davranışı `list_portfolios`'un birden fazla satırı birleştiren `GROUP BY`-benzeri Python mantığıyla (`portfolios: dict[str, Portfolio]`) test edilerek doğrulandı (`test_list_portfolios_attaches_positions` ve ilişkili testler).
- [x] Backend testleri yeşil + ruff temiz.
- [x] **Web görsel doğrulama** (2026-09-21) — Claude tarafından, headless Chromium (Playwright) ile: aynı kullanıcı için iki ayrı portföy ("Portfolio A", "Portfolio B") oluşturuldu, `/portfolio` sayfasında ikisinin de bağımsız kartlar olarak, birbirini etkilemeden (ayrı işlem/silme aksiyonlarıyla) doğru göründüğü doğrulandı.
- [ ] Mobil doğrulama — bu ortamda gerçek simülatör/cihaz yok; kullanıcı bizzat denemeli.

## Teknik Notlar

- Bu story, Story 6.1 ile aynı anda ve aynı dosyalarda uygulandığı için ayrı bir teknik karar içermiyor; dokümantasyon amacıyla PRD/epics.md'deki 3 ayrı story numarasına sadık kalınarak ayrı bir dosya olarak tutuldu.
