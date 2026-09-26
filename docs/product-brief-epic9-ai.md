---
title: "Epic 9 — AI Destekli Yorum ve Örüntü Tanıma: Karar Notu"
status: draft
created: 2026-09-16
updated: 2026-09-26
author: Mary (BMAD Business Analyst) — Serdar Ulaş Budak ile birlikte
relatedDocs: ["docs/PRD.md §5.11, §8, §9", "docs/epics.md §13 (Epic 9)"]
---

# Epic 9 — AI Destekli Yorum ve Örüntü Tanıma: Karar Notu

*İngilizce versiyon: [`docs/product-brief-epic9-ai.en.md`](product-brief-epic9-ai.en.md).*

## Bağlam

Bu doküman, mevcut Faz 1 MVP backlog'u (Epic 1-8) tamamlandıktan sonra eklenecek bir genişleme için yapılan keşif görüşmesinin gerekçesini kayıt altına alır. Borocean **yatırımcıya açılacak** bir proje olduğundan, burada alınan kararlar — özellikle regülasyon riski — yatırımcı sunumundan önce netleştirilmelidir.

## Öncelik Kararı

Kullanıcı, mevcut yol haritasını (Epic 4-8, hepsi Faz 1 MVP kapsamında) **olduğu gibi ve önce** tamamlamayı, AI özelliklerini bunun **sonrasına** eklemeyi tercih etti. AI özellikleri teknik olarak PRD'nin Faz 2 kapsamına girer, ancak kullanıcı tarafından Faz 2'nin geri kalanının (FR-012, FR-033, FR-053, FR-063, FR-071) **önüne** alındı — bu yüzden `docs/epics.md`'ye ayrı bir epic (Epic 9) olarak, MVP sonrası ilk öncelik notuyla eklendi.

## Değerlendirilen Alternatifler ve Kararlar

### 1. AI yorumunun kapsamı

- **Seçenekler:** (a) mevcut skor/metriklerin doğal dil anlatımı — düşük risk, (b) serbest formatlı piyasa/şirket yorumu, (c) sohbet arayüzü, (d) aşamalı (a→c).
- **Karar: (b) Serbest formatlı yorum.** Kullanıcı, mevcut deterministik skor/sinyal anlatımından daha zengin bir yorum istedi.
- **Analist notu:** Serbest formatlı yorum, kaynak veri olmadan (sadece LLM eğitim verisiyle) hem güncelliğini hem doğruluğunu kaybeder ve "yatırım tavsiyesi değildir" pozisyonunu zayıflatır. Bu riski azaltmak için grounding zorunlu kılındı (aşağıya bkz.).

### 2. Grounding (veri zemini)

- **Seçenekler:** (a) Finnhub `company-news` + uygulamanın kendi verisi (RAG), (b) ayrı bir haber/sentiment API'si (Benzinga, Alpha Vantage), (c) grounding yok (salt LLM bilgisi).
- **Karar: (a).** Mevcut Finnhub aboneliği üzerinden genişletilebilir, yeni üçüncü taraf sözleşmesi gerektirmez, orta maliyet. (c) yatırımcı sunumu için önerilmedi (halüsinasyon riski) — kaydedildi, seçilmedi.
- **Açık iş:** Finnhub'ın mevcut plan seviyesinde `company-news` endpoint'inin dahil olup olmadığı teyit edilmeli.

### 3. Yerleşim ve ücretlendirme

- **Karar:** Yalnızca hisse detay sayfası (tarama, portföy, ana ekran kapsam dışı — istenirse sonraki bir story'de genişletilebilir). Premium katman (Epic 8 freemium kapısı) — LLM maliyetini karşılamak ve üst katmana geçiş için bir sebep olmak amacıyla.

### 4. Grafik örüntü tanıma — teknik yaklaşım

- **Seçenekler:** (a) deterministik kural bazlı tespit (trend/destek-direnç/klasik formasyon), (b) geçmiş veriyle eğitilmiş gerçek ML modeli, (c) belirsiz bırak.
- **Karar: Aşamalı — önce (a) [Story 9.2], sonra (b) plana eklendi [FR-102, FR-025'in genişletilmiş hali].**
- **Analist notu (mühendislik ölçeği uyarısı):** (b), veri toplama/etiketleme, eğitim, değerlendirme ve yeniden eğitim döngüsü gerektiren ayrı bir ürün hattıdır — tek geliştirici + yatırımcı zaman baskısı altında PRD'nin kendi "kapsam riski" notunu büyütür. (a), mevcut kural bazlı sinyal motoruyla (Story 3.5/3.7) aynı felsefede, hızlı ve açıklanabilir olduğu için ilk faz olarak seçildi. Bu, PRD'de zaten var olan FR-025'in ("ML tabanlı sinyal, Faz 2") somutlaştırılmış bir uygulamasıdır — yeni bir kapsam değil, mevcut bir açık maddenin netleştirilmiş hali.

### 5. "Trading stratejisi" konumlandırması (regülasyon riski)

- **Seçenekler:** (a) "örüntü/sinyal bulgusu" olarak sun (mevcut ürün diliyle tutarlı), (b) açıkça "AI trading stratejisi" olarak pazarla.
- **Karar: (a).** PRD'de zaten çözülmemiş bir açık soru vardı: *"ilgili ülkelerin (ABD/Türkiye) finansal danışmanlık düzenlemelerine tabi olmama sınırı netleştirilmeli"* (PRD §9). Bir AI'nin "trading stratejisi oluşturması", gerçek emir iletmese bile SPK (TR) / SEC-FINRA (ABD) gözünde yatırım danışmanlığına yaklaşan bir aktivite. (a), mevcut sinyal motoruyla (FR-024) aynı hukuki pozisyonu paylaştığı için tercih edildi.

## ⚠️ Yatırımcı Sunumundan Önce Kapatılması Gereken Risk

PRD §9'daki mevcut açık soru, bu epic ile birlikte somut ve daha acil hale geldi: **"örüntü/sinyal bulgusu" dilinin, yatırım danışmanlığı sınırının dışında kalmak için hukuken yeterli olup olmadığı bir hukuk danışmanıyla teyit edilmeli.** Bu, sadece Epic 9'un değil, mevcut sinyal motorunun (Story 3.5/3.7) ve özet skorun (Story 3.6) da dayandığı bir varsayım — yatırımcılar büyük olasılıkla bu soruyu soracaktır.

## Sonraki Adımlar

1. `docs/PRD.md` §5.11 ve `docs/epics.md` §13'teki FR-100/101/102 ve Story 9.1/9.2 kullanıcı tarafından gözden geçirilip onaylanmalı.
2. Regülasyon riski (yukarıya bkz.) için hukuki görüş alınmalı — yatırımcı sunumundan önce.
3. Finnhub `company-news` endpoint erişimi ve LLM sağlayıcı/maliyet seçimi netleştirilmeli (mimari kararı, `docs/architecture.md`'ye işlenmeli).
4. Epic 1-8 (Faz 1 MVP) tamamlanana kadar Epic 9 geliştirmesi başlamaz.

## 2026-09-18 Güncellemesi: Kapsam Somutlaştırıldı

Epic 1-8 (Faz 1 MVP, Story 8.2 hariç — bkz. not aşağıda) tamamlandıktan sonra kullanıcı, Epic 9'un kapsamını üç ayrı, açıkça etiketlenmiş "görüş" olarak somutlaştırdı: (a) bir görüntü-tabanlı (pretrained CV) modelle teknik/grafik okuması, (b) bir LLM API'siyle temel analiz yorumu, (c) mevcut kural bazlı skorun (Story 3.6/3.7, zaten üretimde) Al/Nötr/Sat çıktısı — üçü aynı panelde, birbirinden ayrı ve karşılaştırılabilir şekilde sunulacak. **Story 8.2 (gerçek premium satın alma akışı) hâlâ kullanıcının kendi ödeme sağlayıcı hesabını kurmasını bekliyor** — Epic 9, Story 8.1'in (entitlement altyapısı) üzerine kuruluyor, satın alma akışına bağımlı değil.

### (a) Teknik Analiz AI — Model Seçimi

Kullanıcı, `hisse_ai_repo_karsilastirma_raporu.pdf` adlı bir karşılaştırma raporu getirdi (4 aday: huseinzol05/Stock-Prediction-Models, Omar-Karimov/ChartScanAI, foduucom/stockmarket-pattern-detection-yolov8, pecu/FinancialVision) ve en kullanılabilir olanın seçilip entegre edilmesini istedi. Canlı araştırma (lisans + teknik doğrulama, WebFetch ile) sonucunda:

| Aday | Lisans | Karar |
|---|---|---|
| huseinzol05/Stock-Prediction-Models | belirsiz, Temmuz 2023'te arşivlenmiş | Elendi — bağımlılık uyumsuzluğu, "kur-çalıştır" değil |
| foduucom/stockmarket-pattern-detection-yolov8 (Hugging Face) | **belirtilmemiş** ("lisans için geliştiricilerle iletişime geçin") | Elendi — ticari/yatırımcıya açık bir üründe kaynağı belirsiz lisanslı model gömmek hukuki risk; ayrıca belirli bir ekran görüntüsü bölgesine (683×768) özel eğitilmiş, mAP@0.5 = 0.614 (orta doğruluk) |
| **Omar-Karimov/ChartScanAI** | **MIT** | **Seçildi** — ticari kullanım serbest, hazır ağırlıklar repo içinde, eğitim verisi **mplfinance ile üretilmiş** candlestick görüntüleri (bizim de kendi OHLC verimizden görüntü üretirken kullanacağımız kütüphaneyle birebir aynı — dağılım uyumsuzluğu riski düşük) |
| pecu/FinancialVision | araştırma odaklı | Elendi — tek bir entegre edilebilir uygulama değil |

**Bilinen sınırlama:** ChartScanAI görece küçük bir toplulukla (157 yıldız) destekleniyor, resmi doğruluk metriği yayınlanmamış; çıktısı yalnızca ikili "Buy"/"Sell" sınıflandırması (isimli formasyon değil). Bu model "deneysel/gösterge niteliğinde" konumlandırılacak — mevcut "yatırım tavsiyesi değildir" dil politikasına tabi, deterministik skordan (Story 3.6/3.7) ayrı ve açıkça etiketlenmiş bir ikinci görüş olarak sunulacak (iki görüşün uyumu/uyumsuzluğu kullanıcıya şeffaf gösterilir).

### (b) Temel Analiz AI — Sağlayıcı Seçimi

Kullanıcı önce "Claude'un finans skill'i" adlı bir API'den bahsetti; bu isimde, doğrudan çağrılabilir ayrı bir Anthropic ürünü doğrulanamadı. Bunun yerine **Anthropic Claude API** (console.anthropic.com, ayrı bir hesap ve pay-as-you-go faturalama gerektiriyor — claude.ai Pro aboneliği API erişimi içermiyor), kendi yazacağımız bir "finansal analist" sistem prompt'uyla kullanılacak; RAG zemini uygulamanın kendi hesapladığı temel verisi (F/K, ROE, borç/özsermaye, sektör kıyaslaması, geçmiş finansal performans — Epic 2 çıktısı) olacak.

> **2026-09-19 güncellemesi:** Sağlayıcı **Google Gemini API**'ye geçirildi (commit `b868efb`, model `gemini-3.6-flash`) — kod artık `app/ai_reports.py::call_gemini()` üzerinden `GOOGLE_API_KEY` ile çalışıyor. Bu bölümdeki Anthropic gerekçesi karar tarihini belgelemek için olduğu gibi bırakıldı; güncel entegrasyon için bkz. `docs/stories/story-9.1.md` Bağlam. RAG zemini (Epic 2'nin temel verisi) ve maliyet-kontrollü önbellek deseni değişmedi.

### (c) Deterministik Analiz

Yeni geliştirme gerekmiyor — `app/scoring.py`'deki `compute_score()` (Story 3.6/3.7) zaten 0-100 skor + Al/Nötr/Sat etiketi + "yatırım tavsiyesi değildir" ibaresi üretiyor. Bu, üçüncü panel olarak (a) ve (b)'nin yanına yeniden sunulacak.

### Mimari Kararlar

- **Celery/Redis kullanılmayacak** — mimaride planlanmış olsa da (AD-8) hiçbir story bugüne kadar bunu kurmadı, her şey istek-anında hesaplanıyor; bu tutarlılık korunuyor.
- **Global önbellek** (`ai_reports` tablosu, sembol+borsa+rapor-türü bazlı, TTL'li) — kullanıcı bazlı değil, LLM/CV maliyetini kontrol etmek için.
- **Ağır CV bağımlılığı (ultralytics/torch/mplfinance) tembel yüklenecek** — yalnızca teknik AI uç noktasına ilk istek geldiğinde, process-level singleton olarak.
  - **2026-09-25 güncellemesi (commit `d114072`):** Render'ın 512 MB bellek sınırı aşıldığı için (ultralytics + torch süreci ~800 MB'a çıkarıyordu) model artık **ONNX Runtime** ile çalışıyor; torch ve ultralytics bağımlılıklardan çıkarıldı. ultralytics'in letterbox ve sınıf-duyarlı NMS adımları birebir yeniden yazıldı (8 grafikte tespitlerin aynı olduğu doğrulandı). ONNX dosyası (>100 MB) `chartscan-yolov8-onnx-v1` release asset'inden indirilip SHA-256 ile sabitleniyor. Tembel yükleme ve process-level singleton deseni korundu.
- **Entitlement genişletmesi**: `Entitlement.ai_reports: bool`, backend'de zorlanıyor (403) — Story 8.1'in gelişmiş-indikatör kilidinden farklı olarak, burada gerçek para/CPU maliyeti olduğu için yalnızca istemci tarafı gizleme yeterli değil.

Detaylı uygulama planı: bkz. Story 9.1 (`docs/stories/story-9.1.md`, artık "Temel Analiz AI Raporu") ve Story 9.2 (`docs/stories/story-9.2.md`, artık "Teknik Analiz AI Raporu — CV Modeli").

## 2026-09-19 Güncellemesi: Story 9.3 — Günlük Sektör Bülteni

Kullanıcı, dashboard'da her gün üstüne yeni bir tane eklenen, hiç silinmeyen bir AI sektör bülteni istedi (bir sektör + o sektördeki görece iyi hisselerin analizi, premium'a özel). Bu, Epic 9'un kapsamına giren dördüncü bir AI özelliği.

**Zamanlama kararı:** Kullanıcıya açıkça soruldu — proje boyunca hiçbir zamanlanmış görev (Celery/cron) altyapısı kurulmadı, her şey istek anında hesaplanıyor. Kullanıcı, yeni bir cron/Railway job kurmak yerine **istek-anında üretim + kalıcı arşiv** yaklaşımını onayladı: günün ilk isteğinde bülten üretilir, kalıcı olarak eklenir; ertesi gün başka bir istek geldiğinde o günün bülteni **ayrıca** üretilip eskilerin üzerine eklenir (asla silinmez/üzerine yazılmaz).

**Veri deseni:** Story 9.1/9.2'nin `ai_reports` tablosu tek-satır-üzerine-yaz önbellek deseni için tasarlandığından, bülten için ayrı bir `sector_bulletins` tablosu kuruldu (append-only, `bulletin_date unique`).

**Sektör/hisse seçimi:** Sektör, `ALL_SECTORS`'tan (11 sektör) `day_of_year % 11` deterministik rotasyonla seçiliyor (sıfır ek API maliyeti). Sektördeki hisseler mevcut kural bazlı skor motoruyla (Story 3.6/3.7) puanlanıp en yüksek 5'i seçiliyor — yeni bir seçim algoritması icat edilmedi, var olan altyapı tekrar kullanıldı.

Detaylı plan: `docs/stories/story-9.3.md`.
