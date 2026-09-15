---
title: "Story 9.2: Deterministik Grafik Örüntü Tespiti"
epic: "Epic 9 — AI Destekli Yorum ve Örüntü Tanıma"
story_id: "9.2"
status: planned
created: 2026-09-16
updated: 2026-09-16
author: Mary (BMAD Business Analyst)
based_on: ["docs/PRD.md §5.11", "docs/epics.md §13", "docs/product-brief-epic9-ai.md"]
depends_on: ["3.1", "3.2", "3.4"]
---

# Story 9.2: Deterministik Grafik Örüntü Tespiti

## Kullanıcı Hikayesi

As a **aktif trader**,
I want fiyat grafiğinde trend çizgisi, destek/direnç seviyeleri ve klasik formasyonların otomatik tespit edildiğini görmek,
So that manuel çizim yapmadan grafikteki önemli seviyeleri/örüntüleri hızlıca fark edebileyim.

*(Kaynak: `docs/epics.md` §13, Epic 9 — Story 9.2; PRD FR-101.)*

## Bağlam

> **Ön koşul:** Epic 1-8 (Faz 1 MVP) tamamlanmadan bu story'ye başlanmaz.

Bu story, **kural bazlı/deterministik** bir örüntü tespitidir — geçmiş piyasa verisiyle eğitilmiş bir ML modeli **değildir**. Bu ayrım bilinçli bir karar: `docs/product-brief-epic9-ai.md`'de detaylandırıldığı gibi, gerçek bir ML modeli (FR-102, FR-025'in genişletilmiş hali) ayrı bir veri/eğitim/değerlendirme altyapısı gerektiren, tek geliştirici için aylar sürebilecek bir iş. Bu story, mevcut kural bazlı sinyal motoruyla (Story 3.5/3.7, `app/technical.py`) aynı felsefede — zaten hesaplanan mum/indikatör verisi üzerinde matematiksel/geometrik tespit kuralları çalıştırır (örn. yerel min/maks noktalarından trend çizgisi fitleme, fiyat kümelenmesinden destek/direnç, bilinen formasyon şablonlarıyla eşleştirme).

**Regülasyon çerçevesi (kritik):** Bu story'nin çıktısı asla "AI trading stratejisi" veya "öneri" dilinde sunulmaz — mevcut sinyal motoruyla (FR-024) aynı hukuki pozisyonu paylaşan **"örüntü/sinyal bulgusu"** çerçevesinde sunulur. Gerekçe ve açık risk için bkz. `docs/product-brief-epic9-ai.md` §5 ve "Yatırımcı Sunumundan Önce Kapatılması Gereken Risk".

**BIST kapsamı:** BIST için canlı mum verisi yok (Story 3.1'den beri tutarlı mimari karar) — bu story de BIST için "veri yok" uyarısı döner.

## Kapsam

- **Backend:** Yeni bir örüntü tespit modülü (öneri: `app/patterns.py`) — trend çizgisi fitleme, destek/direnç kümeleme, klasik formasyon tespiti (üçgen, omuz-baş-omuz, bayrak/flama vb. — kesin küme mimari aşamasında netleştirilir); `GET /symbols/patterns` (veya `technical.py`'ye ek) uç noktası.
- **Web/Mobil:** Fiyat grafiği üzerinde tespit edilen çizgi/seviye/formasyonların görsel işaretlenmesi (mevcut `lightweight-charts` overlay altyapısı, Story 3.1/3.2/3.4 ile aynı desen); bulgu listesi/açıklama paneli.

**Kapsam dışı:**
- Geçmiş veriyle eğitilmiş ML modeli (FR-102/FR-025) — ayrı, gelecek bir story.
- "Trading stratejisi" veya alım-satım önerisi üretimi.
- BIST için mum verisi entegrasyonu.

## Görevler

1. **[Mimari]** Tespit edilecek formasyon/seviye kümesi netleştirilmeli (kapsam kontrolü — çok geniş bir küme mühendislik riskini büyütür; küçük, yüksek-güvenilirlikli bir küme ile başlanması önerilir). ☐
2. **[Backend]** `app/patterns.py`: trend çizgisi fitleme (yerel min/maks + regresyon), destek/direnç kümeleme (fiyat seviyesi yoğunluğu). ☐
3. **[Backend]** Klasik formasyon eşleştirme kuralları (ilk fazda 2-3 formasyonla sınırlı tutulması önerilir — bkz. Görev 1). ☐
4. **[Backend]** `GET /symbols/patterns` uç noktası; "örüntü/sinyal bulgusu" dilini kullanan yanıt şeması (mevcut `signals` yanıt şemasıyla tutarlı). ☐
5. **[Backend]** Testler: her tespit kuralı için bilinen girdi/çıktı senaryoları, "belirgin örüntü yok" durumu, BIST uyarısı. ☐
6. **[Web]** Grafik overlay'i (tespit edilen çizgi/seviyeler) + bulgu paneli. ☐
7. **[Mobil]** Aynı overlay, WebView köprüsü üzerinden (Story 3.1 deseni). ☐

## Kabul Kriterleri

**AC1 — Tespit ve işaretleme**
- **Given** bir hissenin teknik verisi, **When** kural bazlı örüntü tanıma algoritması çalıştırılırsa, **Then** tespit edilen trend çizgisi/destek-direnç seviyeleri ve klasik formasyonlar grafik üzerinde işaretlenir (FR-101).

**AC2 — Dil/çerçeve**
- **Given** bir bulgu listelenir, **When** kullanıcı bulguya bakarsa, **Then** bulgu "örüntü/sinyal bulgusu" olarak sunulur; "AI trading stratejisi" veya "öneri" ifadesi kullanılmaz.

**AC3 — Belirsiz durum**
- **Given** yeterli veri/net bir örüntü yoksa, **When** tespit çalıştırılırsa, **Then** "belirgin bir örüntü tespit edilmedi" durumu gösterilir, zorlama bir bulgu üretilmez.

**AC4 — Kapsam sınırı**
- **And** bu story'nin çıktısı kural bazlı/deterministiktir; ML modeli (FR-102/FR-025) bu story'nin kapsamında değildir.

## Definition of Done

- [ ] AC1–AC4 karşılanıyor ve doğrulandı.
- [ ] Formasyon/seviye kümesi kapsamı mimari aşamasında netleştirildi ve `docs/architecture.md`'ye işlendi.
- [ ] Backend testleri (her kural için) yeşil + ruff temiz.
- [ ] Web: typecheck, lint, build yeşil.
- [ ] Mobil: typecheck, lint, Metro bundle yeşil.
- [ ] Ürün metinlerinde ("örüntü/sinyal bulgusu" vb.) "tavsiye"/"strateji" dili kullanılmadığı gözden geçirildi.
- [ ] Gerçek tarayıcıda/cihazda görsel-etkileşim doğrulaması yapıldı.

## Teknik Notlar

- **Yanlış pozitif riski:** Geometrik/istatistiksel formasyon eşleştirme doğası gereği gürültülü olabilir (özellikle küçük zaman dilimlerinde). AC3 bilinçli olarak "zorlama bulgu üretme" ilkesini kabul kriteri yaptı — eşik/güven skorları mimari aşamasında netleştirilmeli.
- **Story 9.1 ile ilişki:** Bu story'nin ürettiği bulgular, ileride Story 9.1'in AI yorumuna girdi olarak da kullanılabilir (örn. "tespit edilen üçgen formasyonu" prompt'a eklenebilir) — bu story kapsamında zorunlu değil, gelecekte değerlendirilebilecek bir genişleme.
- **ML'e geçiş yolu:** Bu story'nin çıktısı (etiketlenmiş örüntü tespitleri), ileride FR-102 kapsamındaki ML modeli için bir başlangıç etiketleme/değerlendirme seti olarak da kullanılabilir — bilinçli bir mimari fayda, ama bu story'nin kabul kriteri değildir.
