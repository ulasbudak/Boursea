---
title: "Story 9.2: Teknik Analiz AI Raporu — CV Modeli"
epic: "Epic 9 — AI Destekli Yorum ve Örüntü Tanıma"
story_id: "9.2"
status: done
created: 2026-09-16
updated: 2026-09-18
author: Mary (BMAD Business Analyst) & Bob (BMAD Scrum Master) — Serdar Ulaş Budak ile birlikte
based_on: ["docs/PRD.md §5.11", "docs/epics.md §13", "docs/product-brief-epic9-ai.md §\"2026-09-18 Güncellemesi\""]
depends_on: ["3.1", "3.2", "8.1"]
---

# Story 9.2: Teknik Analiz AI Raporu — CV Modeli

## Kullanıcı Hikayesi

As a **aktif trader**,
I want fiyat grafiğimin bir görüntü-tanıma modeliyle okunduğu bir teknik AI raporu görmek,
So that grafiği manuel yorumlamadan modelin "okumasını" diğer görüşlerle (temel AI, deterministik skor) karşılaştırabileyim.

*(Kaynak: `docs/epics.md` §13, Epic 9 — Story 9.2; PRD FR-101.)*

## Bağlam

Bu story, 2026-09-16'da yazılan orijinal taslağın ("Deterministik Grafik Örüntü Tespiti" — geometrik/istatistiksel kural bazlı tespit) yerine, kullanıcının 2026-09-18'de getirdiği `hisse_ai_repo_karsilastirma_raporu.pdf` karşılaştırma raporuna dayanarak seçilen **gerçek bir önceden eğitilmiş CV modeliyle** değiştirildi. Deterministik/kural bazlı kısım artık ayrı bir iş değil — `app/scoring.py`'deki mevcut `compute_score()` (Story 3.6/3.7) zaten bir Al/Nötr/Sat çıktısı üretiyor ve hisse detay sayfasında üçüncü panel olarak yeniden sunuluyor (bu story'nin kapsamında yeni geliştirme gerektirmiyor).

**Model seçimi (canlı araştırma ile doğrulandı — bkz. `docs/product-brief-epic9-ai.md` §"2026-09-18 Güncellemesi" tam gerekçe için):**

PDF'teki 4 adaydan (huseinzol05/Stock-Prediction-Models, Omar-Karimov/ChartScanAI, foduucom/stockmarket-pattern-detection-yolov8, pecu/FinancialVision) **Omar-Karimov/ChartScanAI** seçildi:
- **MIT lisanslı** (ticari kullanım serbest — foduucom'un lisansı belirtilmemiş, ticari/yatırımcıya açık bir üründe kabul edilemez risk; huseinzol05 arşivlenmiş; FinancialVision tek bir entegre uygulama değil).
- Hazır eğitilmiş ağırlıklar repo içinde (`weights/`) — sıfırdan eğitim gerekmiyor.
- Eğitim verisi **mplfinance ile üretilmiş** candlestick görüntüleri — bizim de kendi OHLC verimizden görüntü üretirken kullanacağımız kütüphaneyle birebir aynı, bu yüzden dağılım uyumsuzluğu riski diğer adaylara göre düşük.
- **Bilinen sınırlama:** Model yalnızca ikili "Buy"/"Sell" sınıflandırması üretiyor (isimli formasyon değil — örn. "üçgen" veya "omuz-baş-omuz" gibi bir etiket yok), görece küçük bir toplulukla (157 yıldız) destekleniyor, resmi doğruluk metriği (mAP vb.) yayınlanmamış.

**Regülasyon çerçevesi (kritik):** Bu modelin çıktısı asla "AI trading stratejisi" veya "öneri" dilinde sunulmaz; deterministik skordan (üçüncü panel) **ayrı ve açıkça etiketlenmiş, "grafik modelinin okuması"** olarak sunulur — iki görüşün uyumu/uyumsuzluğu kullanıcıya şeffaf gösterilir, tek bir "doğru cevap" gibi sunulmaz. Modelin deneysel/gösterge niteliğinde olduğu ve resmi doğruluk metriğinin sınırlı olduğu belirtilir. Gerekçe için bkz. `docs/product-brief-epic9-ai.md` §5 ve "Yatırımcı Sunumundan Önce Kapatılması Gereken Risk".

**BIST kapsamı:** BIST için canlı mum verisi yok (Story 3.1'den beri tutarlı mimari karar) — bu story de BIST için "veri yok" uyarısı döner.

## Kapsam

- **Backend:**
  - `pyproject.toml`'a yeni bağımlılıklar: `ultralytics` (+ transitive `torch`, `opencv-python-headless`), `mplfinance` (+ transitive `pandas`) — bu API'nin ilk ağır ML bağımlılığı (şu an yalnızca `fastapi`/`psycopg`/`httpx`/`pyjwt` gibi hafif paketler var).
  - ChartScanAI'nin `weights/best.pt` dosyası: boyutuna göre repoya commit edilir (küçükse) veya build/deploy zamanında sabit bir URL'den indirilir (büyükse) — lisans (MIT) ticari/dahili kullanım ve yeniden dağıtımı kapsıyor.
  - Yeni `app/ai_technical.py`: candle verisinden (`app/market_data.py`, mevcut Twelve Data kaynağı) `mplfinance` ile candlestick görüntüsü üretimi → YOLOv8 modeliyle inference (**lazy-loaded process-level singleton** — yalnızca bu uç noktaya ilk istek geldiğinde yüklenir, uygulama başlangıcını yavaşlatmaz) → sonucu Türkçe bir "model okuması" metnine sarma → önbellek okuma/yazma (`ai_reports` tablosu, Story 9.1'de oluşturuldu; TTL: 4-6 saat — grafik gün içinde değişir).
  - `GET /symbols/ai-report/technical` uç noktası: entitlement kontrolü (403 free kullanıcıda), önbellek varsa döndür, yoksa üret+kaydet+döndür.
- **Web/Mobil:** Story 9.1'in "AI Analiz" bölümünde ikinci panel — "Teknik Analiz AI Raporu" (model okuması + "deneysel" uyarı notu), aynı "Rapor Oluştur" tetikleme ve kilit deseni.

**Kapsam dışı:**
- Kendi verimizle eğitilmiş/fine-tune edilmiş bir ML modeli (FR-102/FR-025) — ayrı, gelecek bir story.
- İsimli formasyon tespiti (üçgen, omuz-baş-omuz vb.) — seçilen model bunu üretmiyor, yalnızca ikili Buy/Sell.
- "Trading stratejisi" veya alım-satım önerisi üretimi.
- BIST için mum verisi entegrasyonu.

## Görevler

1. **[Backend]** `best.pt` dosyasını indir, boyutunu kontrol et, barındırma kararını uygula (repo'ya commit vs. deploy-zamanı indirme). ✅ — GitHub API ile boyut (52MB) ve LICENSE (MIT) doğrudan doğrulandı; deploy-zamanı indirme (pinned commit) seçildi, repoya commit edilmedi.
2. **[Backend]** `pyproject.toml`: `ultralytics`, `mplfinance` bağımlılıkları. ✅
3. **[Backend]** `app/ai_technical.py`: görüntü üretimi + lazy-loaded model + inference + önbellek. ✅
4. **[Backend]** `GET /symbols/ai-report/technical` uç noktası (`main.py`) — entitlement 403, BIST "veri yok". ✅
5. **[Backend]** Testler: model/inference mock'lanarak — görüntü üretimi doğru candle verisiyle çağrılıyor mu, önbellekten dönme, premium/ücretsiz erişim kontrolü, BIST uyarısı. Gerçek model ağırlığı test ortamında yüklenmez. ✅
6. **[Web]** "AI Analiz" bölümünde teknik AI paneli + "deneysel model" uyarı notu. ✅
7. **[Mobil]** Aynı panel, `StockOverviewScreen`'de. ✅

## Kabul Kriterleri

**AC1 — Model okuması ve etiketleme**
- **Given** bir hissenin mum verisi, **When** kullanıcı "Teknik Analiz AI Raporu"nu talep ederse, **Then** candle verisinden üretilen bir grafik görüntüsü ChartScanAI/YOLOv8 modeliyle okunur ve sonuç, deterministik skordan **ayrı ve açıkça etiketlenmiş** bir "modelin okuması" olarak sunulur (FR-101).

**AC2 — Dil/çerçeve ve sınırlama şeffaflığı**
- **Given** bir bulgu gösterilir, **When** kullanıcı bulguya bakarsa, **Then** bulgu "grafik modelinin okuması/bulgusu" dilinde sunulur; "AI trading stratejisi" veya "öneri" ifadesi kullanılmaz; **And** modelin deneysel/gösterge niteliğinde olduğu ve resmi doğruluk metriğinin sınırlı olduğu açıkça belirtilir.

**AC3 — Premium kilidi (backend zorlamalı)**
- **Given** ücretsiz katmandaki bir kullanıcı, **When** rapor talep ederse, **Then** özellik kilitli gösterilir; **And** backend isteği 403 ile reddeder (CV inference gerçek CPU maliyeti taşıyor, yalnızca istemci tarafı gizleme yeterli değil).

**AC4 — Belirsiz durum ve maliyet kontrolü**
- **Given** BIST gibi mum verisi olmayan bir sembol, **When** rapor talep edilirse, **Then** "veri yok" durumu gösterilir, zorlama bir bulgu üretilmez.
- **And** aynı sembol için art arda gelen istekler modeli her seferinde tetiklemez — TTL'li global önbellekten döner.

## Definition of Done

- [x] AC1–AC4 karşılanıyor ve doğrulandı.
- [x] `best.pt` barındırma kararı uygulandı ve lisans (MIT) doğrulaması dokümana işlendi.
- [x] Backend testleri (mock'lu) yeşil + ruff temiz (281/281 test).
- [x] Web: typecheck, lint, build yeşil.
- [x] Mobil: typecheck, lint, Metro bundle yeşil.
- [x] **Gerçek bir sembolün grafiğiyle canlı uçtan uca doğrulandı** — yerel API sunucusu + gerçek AAPL/MSFT mum verisi (Twelve Data) + gerçek ChartScanAI model ağırlığıyla `GET /symbols/ai-report/technical` çağrıldı; makul bir çıktı alındı (örn. MSFT için 3 Al/1 Sat, en yüksek güven %68 Sell); ikinci çağrıda önbellekten aynı `generated_at` ile döndüğü doğrulandı.
- [x] **Ücretsiz katman kullanıcısıyla 403 doğrulandı** — taze bir Supabase kullanıcısı (`ai-reports-smoke`) ile gerçek JWT üzerinden canlı çağrıldı, doğru Türkçe mesajla 403 alındı; ardından `entitlements` tablosuna elle `premium` satırı eklenip aynı kullanıcıyla 200 + gerçek rapor alındığı doğrulandı. Test verisi sonrasında temizlendi.
- [x] Ürün metinlerinde "tavsiye"/"strateji" dili kullanılmadığı ve model sınırlamasının (deneysel, sınırlı topluluk/metrik) açıkça belirtildiği gözden geçirildi.
- [x] **Web görsel doğrulama** (2026-09-21) — Claude tarafından, headless Chromium (Playwright) ile: hisse detayında AI Analiz sekmesinde "Technical Analysis AI Report" için "Generate Report" tıklandı, gerçek ChartScanAI çıktısı ("4 Al ve 1 Sat örüntüsü tespit etti... En yüksek güvenli bulgu: Sell (%58 güven)") ve "deneysel/gösterge niteliğinde" uyarısı doğru göründü.
- [ ] Mobil doğrulama — bu ortamda gerçek simülatör/cihaz yok; kullanıcı bizzat denemeli.

## Teknik Notlar

- **Tembel yükleme:** Model, uygulama başlangıcında değil, bu uç noktaya ilk istek geldiğinde bir kere yüklenip process-level singleton olarak tutulur — diğer (hafif) uç noktaların ve Railway health check'inin başlangıç süresini etkilememesi için.
- **Yanlış pozitif/model belirsizliği riski:** Model resmi doğruluk metriği yayınlamıyor (mAP@0.5 = 0.614, benzer modeller için tipik orta düzey) — çıktı her zaman bir güven/belirsizlik notuyla sunulmalı, kesin bir gerçek gibi değil.
- **Story 9.1 ile ilişki:** Bu story'nin ürettiği model okuması, ileride Story 9.1'in temel analiz raporuna girdi olarak da kullanılabilir (örn. "teknik model X sinyali verdi" prompt'a eklenebilir) — bu story kapsamında zorunlu değil.
- **ML'e geçiş yolu:** Üçüncü taraf modelin sınırlamaları netleşince (kullanım verisi biriktikçe), ileride FR-102 kapsamında kendi verimizle eğitilmiş bir model değerlendirilebilir — bilinçli bir mimari fayda, ama bu story'nin kabul kriteri değildir.
