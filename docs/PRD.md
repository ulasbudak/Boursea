---
title: "Boursea (Borsa Takip Uygulaması) - Ürün Gereksinim Dokümanı"
status: draft
created: 2026-09-15
updated: 2026-09-16
author: Mary (BMAD Business Analyst) — Serdar Ulaş Budak ile birlikte
---

# Boursea — PRD

*English version: [`docs/PRD.en.md`](PRD.en.md).*

## 1. Özet ve Vizyon

**Boursea**, Amerikan (NYSE/NASDAQ) ve Türkiye (BIST) borsalarındaki hisseleri, dünyada en yaygın kullanılan **temel analiz (fundamental)** parametreleriyle değerlendiren ve buna ek olarak kapsamlı bir **teknik analiz** deneyimi sunan; web ve mobil platformlarda çalışan bir yatırım araştırma uygulamasıdır.

Ürün, hem yeni başlayan bireysel yatırımcıya (özet skorlar, anlaşılır metrikler) hem de aktif tradera (geniş indikatör kütüphanesi, tarama/sinyal araçları) hitap eden katmanlı bir deneyim hedefler. Uygulama bir **aracı kurum / brokerage değildir** — alım-satım emri iletmez, sadece araştırma ve karar destek aracı olarak konumlanır.

**Vizyon cümlesi:** "Kullanıcının, ABD ve Türkiye borsalarındaki herhangi bir hisseyi, dünya standardı metriklerle saniyeler içinde değerlendirip kendi izleme/portföy akışına dahil edebildiği tek uygulama."

## 2. Hedef Kitle

| Segment | Tanım | Öncelikli İhtiyaç |
|---|---|---|
| **Yeni/Amatör Yatırımcı** | Temel analiz kavramlarına yeni, karmaşadan kaçınan kullanıcı | Sade özet skor, "bu hisse ucuz mu pahalı mı" gibi sorulara hızlı yanıt |
| **Aktif Trader / Teknik Analist** | Grafik okuma, indikatör kullanma deneyimi olan kullanıcı | Geniş indikatör kütüphanesi, çoklu zaman dilimi, tarama/sinyal |

Uygulama her iki segmente de aynı veri üzerinde farklı derinlik seviyeleriyle hizmet eder (basit özet katmanı + altına inebilen detay katmanı).

## 3. Kapsanan Piyasalar ve Varlıklar

- **Faz 1 (MVP):** Yalnızca hisse senedi. ABD borsaları (NYSE, NASDAQ) ve Türkiye (BIST) — tüm işlem gören hisseler + başlıca endeksler (S&P 500, Nasdaq 100, Dow Jones, BIST 100, BIST 30 vb.) ve ETF'ler birinci sınıf varlık olarak desteklenir.
- **Faz 2+ (kapsam dışı, mimari buna kapalı olmayacak şekilde tasarlanmalı):** Kripto para ve döviz (forex) varlık sınıfları.

## 4. Kullanıcı Senaryoları (User Journeys)

> Not: Aşağıdaki senaryolar taslak olarak yazılmıştır; kullanıcı onayı ile kesinleştirilecektir (bkz. Açık Sorular).

**UJ-1 — Ayşe, yeni başlayan bireysel yatırımcı:**
Ayşe bir haberde adını duyduğu bir ABD hissesini uygulamada arar. Şirket kartında karşısına önce bir **özet skor/derecelendirme** ve "bu hisse sektörüne göre ucuz/pahalı" gibi sade bir yorum çıkar. P/E, temettü verimi gibi birkaç anahtar metriği sektör ortalamasıyla karşılaştırmalı görür. Hisseyi izleme listesine ekler ve fiyat belli bir seviyenin altına düşerse bildirim almak üzere bir alarm kurar.

**UJ-2 — Mehmet, aktif trader:**
Mehmet sabah rutininde BIST'te belirlediği kriterlere uyan hisseleri bulmak için **gelişmiş tarama (screener)** aracını açar: piyasa değeri, RSI aralığı, hacim artışı ve kaç günlük kırılım gibi kriterleri birleştirip kaydeder. Sonuçlardan birini açar, grafiğe MACD ve Bollinger Bantları ekler, birden fazla hisseyi yan yana karşılaştırma tablosunda inceler ve portföyüne eklediği pozisyonun anlık kâr/zararını takip eder.

## 5. Fonksiyonel Gereksinimler

Gereksinimler özellik alanlarına göre gruplanmış ve global olarak numaralandırılmıştır. **[MVP]** etiketi Faz 1'de yer alacağını, **[F2]** Faz 2'ye ertelendiğini belirtir (bkz. Bölüm 8 — Faz Planı).

### 5.1 Hisse Arama ve Keşif

- **FR-001** [MVP] Kullanıcı, sembol veya şirket adına göre ABD ve BIST hisselerini arayabilmeli; sonuçlar borsa/piyasa etiketiyle (örn. NASDAQ, BIST) listelenmelidir.
- **FR-002** [MVP] Her hisse için bir "Genel Bakış" kartı: güncel fiyat, günlük değişim, piyasa değeri, temel şirket bilgisi (sektör, endüstri) gösterilmelidir.
- **FR-003** [MVP] Sistem, sade bir **özet skor/derecelendirme** üretmelidir (temel + teknik sinyallerin birleşiminden türetilen, amatör kullanıcı için anlaşılır bir gösterge — örn. 1-100 skoru veya Al/Nötr/Sat etiketi).

### 5.2 Temel Analiz (Fundamental)

- **FR-010** [MVP] Sistem, dünyada en yaygın kullanılan temel analiz metriklerini göstermelidir: F/K (P/E), PD/DD (P/B), ROE, ROA, EPS ve EPS büyüme oranı, temettü verimi, borç/özsermaye oranı, brüt/net kâr marjı, piyasa değeri, FAVÖK (EBITDA) marjı, serbest nakit akışı.
- **FR-011** [MVP] Her metrik, hissenin **sektör/endeks ortalamasına** göre karşılaştırmalı olarak gösterilmelidir (örn. "Sektör ortalaması F/K: 18.2, bu hisse: 14.5").
- **FR-012** [F2] Kullanıcı, kendi önem sırasına göre metriklere ağırlık vererek **özelleştirilmiş bir değerlendirme skoru** oluşturabilmelidir (özelleştirilebilir skor motoru).
- **FR-013** [MVP] Şirketin geçmiş finansal verileri (gelir, net kâr, EPS) en az son 5 yıl/20 çeyrek için grafik olarak sunulmalıdır.

### 5.3 Teknik Analiz

- **FR-020** [MVP] İnteraktif fiyat grafiği: mum (candlestick), çizgi ve bar grafik türleri; gün içi, günlük, haftalık, aylık zaman dilimleri desteklenmelidir.
- **FR-021** [MVP] Çekirdek indikatör seti grafiğe eklenebilmelidir: Basit/Üssel Hareketli Ortalamalar (SMA/EMA), RSI, MACD, Bollinger Bantları, Hacim, Stokastik Osilatör.
- **FR-022** [MVP] Geniş indikatör kütüphanesi (30+ indikatör: ADX, Fibonacci Retracement, Ichimoku, ATR, OBV, Parabolic SAR, Williams %R, vb.) desteklenmelidir.
- **FR-023** [MVP] Kullanıcı grafik üzerine trend çizgisi, yatay destek/direnç çizgisi gibi manuel çizim araçları ekleyebilmelidir.
- **FR-024** [MVP] **Kural bazlı otomatik sinyal üretimi**: sistem, kullanıcı tanımlı veya hazır kural setlerine göre (örn. "RSI 30 altına düştü", "MACD altın kesişim yaptı", "fiyat 50 günlük ortalamayı yukarı kesti") sinyal üretip listeleyebilmelidir. *(Not: Faz 1'de kural tabanlı/deterministik sinyal motoru hedeflenir; ML tabanlı öngörü modelleri Faz 2 kapsamındadır — bkz. FR-025.)*
- **FR-025** [F2] Makine öğrenmesi destekli örüntü tanıma / olasılıksal sinyal skorlama (ileri seviye, Faz 1 sonrası değerlendirilecek).

### 5.4 Tarama (Screener) ve Karşılaştırma

- **FR-030** [MVP] Kullanıcı, temel VE teknik kriterleri (örn. piyasa değeri aralığı, F/K aralığı, RSI aralığı, hacim artışı, sektör, borsa) birlikte kullanarak **çoklu kriter tarama** yapabilmelidir.
- **FR-031** [MVP] Tarama kriterleri kaydedilebilmeli ve kayıtlı taramalar tek tıkla tekrar çalıştırılabilmelidir.
- **FR-032** [MVP] Kullanıcı, birden fazla hisseyi (en az 4) yan yana **karşılaştırma tablosunda** temel ve teknik metriklerle kıyaslayabilmelidir.
- **FR-033** [F2] Kayıtlı taramalar için otomatik bildirim ("kriterlere uyan yeni hisse bulundu") desteklenmelidir.

### 5.5 İzleme Listesi ve Alarmlar

- **FR-040** [MVP] Kullanıcı sınırsız sayıda hisseyi bir veya birden fazla izleme listesine (watchlist) ekleyebilmelidir.
- **FR-041** [MVP] Kullanıcı, fiyat eşiği (üstüne/altına düşünce) bazlı alarm kurabilmelidir.
- **FR-042** [MVP] Kullanıcı, indikatör/sinyal bazlı alarm kurabilmelidir (örn. "RSI 70 üstüne çıkarsa bildir").
- **FR-043** [MVP] Alarm tetiklendiğinde kullanıcıya push bildirim (mobil) ve/veya e-posta ile bilgi verilmelidir.

### 5.6 Portföy Takibi

- **FR-050** [MVP] Kullanıcı, sahip olduğu hisseleri manuel olarak (adet + maliyet fiyatı) portföyüne ekleyebilmelidir.
- **FR-051** [MVP] Sistem, portföyün anlık toplam değerini ve pozisyon bazlı kâr/zarar (TL ve % olarak) hesaplamalıdır.
- **FR-052** [MVP] Çoklu portföy (örn. "ABD hisseleri", "BIST uzun vade") desteklenmelidir.
- **FR-053** [F2] Portföy risk/çeşitlendirme analizi (sektör dağılımı, aşırı yoğunlaşma uyarısı) sunulmalıdır.

### 5.7 Kullanıcı Hesabı ve Kişiselleştirme

- **FR-060** [MVP] Kullanıcılar e-posta veya sosyal hesap (Google/Apple) ile kayıt olup giriş yapabilmelidir.
- **FR-061** [MVP] Kullanıcı, ilgilendiği sektör/hisseleri işaretleyerek kişisel bir ilgi profili oluşturabilmeli; ana ekranda bu profile göre öne çıkan hisseler/haberler gösterilmelidir (kural bazlı öneri, Faz 1).
- **FR-062** [MVP] Kullanıcı, izlediği hisselere kişisel not ekleyebilmelidir.
- **FR-063** [F2] Gelişmiş, davranışsal veriye dayalı **kişiselleştirilmiş öneri motoru** (Faz 1'deki kural bazlı öneriden daha akıllı, kullanım geçmişine dayalı).

### 5.8 Bildirimler

- **FR-070** [MVP] Push bildirimleri (mobil) ve e-posta bildirimleri desteklenmelidir.
- **FR-071** [F2] SMS bildirim kanalı (opsiyonel, premium özelliği olarak değerlendirilebilir).

### 5.9 Abonelik / Monetizasyon (Freemium)

- **FR-080** [MVP] Uygulama **freemium** modelde çalışmalıdır: ücretsiz katman ile premium katman arasında net bir özellik ayrımı olmalıdır (bkz. Bölüm 7 — Açık Sorular, kesin sınır netleştirilecek).
- **FR-081** [MVP] Ücretsiz katmanda: gecikmeli/günlük fiyat verisi, temel metrikler, sınırlı sayıda izleme listesi öğesi ve temel indikatörler sunulmalıdır.
- **FR-082** [MVP] Premium katmanda: gerçek zamanlı veri, geniş indikatör kütüphanesi, sınırsız tarama/alarm, gelişmiş karşılaştırma sunulmalıdır.
- **FR-083** [MVP] Kullanıcı uygulama içinden abonelik satın alıp yönetebilmeli (yükseltme/iptal), ödeme sağlayıcı entegrasyonu (App Store/Play Store içi satın alma + web için kart ödemesi) desteklenmelidir.

### 5.10 Lokalizasyon

- **FR-090** [MVP] Uygulama arayüzü Türkçe ve İngilizce olarak sunulmalı, kullanıcı dil tercihini değiştirebilmelidir.
- **FR-091** [MVP] Sayı/para birimi biçimleri (binlik ayraç, ondalık, TL/USD gösterimi) seçilen dile ve piyasaya göre otomatik uyarlanmalıdır.

### 5.11 AI Destekli Yorum ve Örüntü Tanıma

> **Analist notu (2026-09-16, güncelleme 2026-09-18):** Bu bölüm, MVP (Faz 1, Epic 1-8) tamamlandıktan sonra kullanıcı tarafından **ilk öncelik** olarak işaretlenen bir genişleme kapsar (bkz. `docs/product-brief-epic9-ai.md` — karar gerekçesi ve değerlendirilip elenen alternatifler için). **2026-09-18'de kapsam somutlaştırıldı:** kullanıcı, hisse detay sayfasında ayrı ve açıkça etiketlenmiş **üç görüş** istedi — (a) bir görüntü-tabanlı (pretrained CV) modelle teknik/grafik okuması, (b) bir LLM API'siyle temel analiz yorumu, (c) mevcut kural bazlı skorun (FR-003/FR-024, zaten MVP'de var) Al/Nötr/Sat çıktısı. FR-100 artık genel "haber bazlı serbest yorum" değil, özel olarak **temel analiz** odaklı; FR-101 artık salt geometrik/deterministik kural değil, **önceden eğitilmiş bir CV modeli** kullanıyor (gerekçe ve model seçimi için bkz. `docs/product-brief-epic9-ai.md` §"2026-09-18 Güncellemesi"). Üçüncü görüş (deterministik Al/Sat) yeni bir FR gerektirmiyor — mevcut FR-003/FR-024 çıktısının aynı panelde yeniden sunumu.

- **FR-100** [F2 — MVP sonrası ilk öncelik] Sistem, hisse detay sayfasında, seçilen hisse için **temel analiz odaklı bir AI raporu** üretmelidir. Rapor, uygulamanın kendi hesapladığı temel verilerle (F/K, ROE, borç/özsermaye, sektör kıyaslaması, geçmiş finansal performans — Epic 2 çıktısı) zemine oturtulmalı (RAG); salt LLM eğitim verisine dayanmamalıdır. LLM sağlayıcı: Google Gemini API (2026-09-18'de Anthropic Claude olarak kararlaştırıldı, 2026-09-19'da Gemini'ye geçirildi — bkz. `docs/stories/story-9.1.md` Bağlam). Bu özellik premium katmana bağlıdır (bkz. FR-080-083) ve maliyet kontrolü için sembol başına önbelleğe alınır (kullanıcı bazlı değil).
- **FR-101** [F2 — MVP sonrası ilk öncelik] Sistem, fiyat grafiğinden üretilen bir candlestick görüntüsü üzerinde, **önceden eğitilmiş bir görüntü-tanıma (CV) modeliyle** grafik okuması yapmalıdır (model seçimi ve gerekçesi: `docs/product-brief-epic9-ai.md` §"2026-09-18 Güncellemesi" — MIT lisanslı, hazır ağırlıklı bir YOLOv8 modeli). Çıktı, mevcut sinyal motoruyla (FR-024) aynı hukuki çerçevede, deterministik skordan **ayrı ve açıkça etiketlenmiş bir "modelin okuması"** olarak sunulmalı; "AI trading stratejisi" gibi tavsiye niteliğinde bir dille konumlandırılmamalıdır (bkz. Bölüm 9, yatırım danışmanlığı sınırı). Bu özellik premium katmana bağlıdır ve sembol başına önbelleğe alınır.
- **FR-102** [F2 — FR-025'in genişletilmiş hali] FR-101'de kullanılan hazır (üçüncü taraf) modelin ötesinde, uygulamanın **kendi verisiyle eğitilmiş/fine-tune edilmiş** bir ML modeliyle örüntü tanıma/olasılıksal sinyal skorlaması yapılmalıdır. Bu, FR-025'te tanımlanan işin somut bir uygulamasıdır; ayrı bir veri/ML altyapısı (etiketleme, eğitim, değerlendirme, yeniden eğitim döngüsü) gerektirdiğinden Faz 2'nin ilerleyen bir alt-fazında, FR-100/FR-101 üretime alındıktan sonra ele alınmalıdır.

### 5.12 Alım-Satım Simülasyonu (Paper Trading)

> **Analist notu (2026-09-19):** Kullanıcı isteği üzerine backlog'a eklenen, önceden hiçbir yerde planlanmamış yeni bir kapsam — Epic 10 olarak MVP sonrası **hemen** (Epic 9 ile eş zamanlı) geliştiriliyor. Gerçek para/aracı kurum bağlantısı **yok** (bkz. Bölüm 10, kapsam dışı); tamamen sanal bir bütçeyle, gerçek piyasa fiyatlarından yürütülen bir kum havuzu. Mevcut Portföy özelliğinden (FR-050/051/052) kasıtlı olarak ayrı: Portföy kullanıcının gerçekten sahip olduğu pozisyonları elle girilen fiyatlarla kaydeder (bütçe kısıtı yok); bu özellik ise bütçe kısıtlı ve emirler gerçek anlık fiyattan otomatik yürütülür.

- **FR-110** Sistem, kullanıcının bir başlangıç bütçesi (sanal nakit) belirleyerek bir alım-satım simülasyonu oluşturmasına izin vermelidir. Bu özellik, mevcut freemium sınırlamasıyla aynı desende (bkz. FR-080-083) ücretsiz katmanda sınırlı (1 simülasyon), premium katmanda sınırsızdır.
- **FR-111** Sistem, simülasyon içinde bir sembol için alım/satım emri verildiğinde, emri **kullanıcının girdiği bir fiyattan değil, o anki gerçek piyasa fiyatından** yürütmelidir. Alım emri, emrin maliyeti simülasyonun nakit bakiyesini aşıyorsa reddedilmelidir; satım emri, elde tutulan miktarı aşıyorsa reddedilmelidir. Yalnızca ABD hisseleri desteklenir (BIST için canlı fiyat kaynağı yok, bkz. FR-041).
- **FR-112** Sistem, her simülasyon için günlük toplam değer (nakit + pozisyon değeri) ve kâr/zarar geçmişini göstermelidir. Zamanlanmış bir arka plan işi (cron) kurulmadığından (bkz. mimari kısıt, Epic 9/Story 9.3'te de aynı yaklaşım), günün kaydı kullanıcı simülasyonu her açtığında veya her emirden sonra yeniden hesaplanır; geçmiş günlerin kayıtları bir daha değiştirilmez.

## 6. Fonksiyonel Olmayan Gereksinimler (NFR)

| Kategori | Gereksinim |
|---|---|
| **Performans** | Gerçek zamanlı fiyat verisi, piyasa kaynağından itibaren makul bir gecikmeyle (hedef: birkaç saniye içinde) kullanıcıya ulaşmalıdır. Hisse arama sonuçları 1 saniyenin altında dönmelidir. |
| **Güvenilirlik** | Piyasa açık saatlerinde uygulama erişilebilirliği hedeflenen bir uptime seviyesinde olmalıdır (öneri: %99.5+). Veri sağlayıcı kesintisinde kullanıcıya "veri gecikmeli/kullanılamıyor" uyarısı gösterilmelidir, sessiz hata olmamalıdır. |
| **Veri Doğruluğu ve Sorumluluk Reddi** | Tüm ekranlarda "yatırım tavsiyesi değildir" ibaresi bulunmalı; veri sağlayıcı lisans/gecikme koşulları kullanıcıya şeffaf şekilde belirtilmelidir. |
| **Güvenlik** | Kullanıcı hesap bilgileri ve portföy verileri (finansal nitelikte kişisel veri) şifreli saklanmalı; kimlik doğrulama endüstri standardı yöntemlerle (OAuth/JWT vb.) yapılmalıdır. |
| **Ölçeklenebilirlik** | Sistem, iki ayrı piyasadan (ABD + BIST) gelen veri hacmini ve büyüyen kullanıcı tabanını (screener/tarama gibi hesaplama-yoğun işlemler dahil) karşılayacak şekilde tasarlanmalıdır. |
| **Platformlar Arası Tutarlılık** | Web ve mobil (iOS/Android) arasında özellik paritesi ve tutarlı kullanıcı deneyimi hedeflenmelidir; mobil-özel kısıtlar (küçük ekran) grafik/tarama arayüzlerinde gözetilmelidir. |
| **Yasal/Uyumluluk** | Uygulama bir yatırım danışmanlığı/aracılık hizmeti sunmadığından ilgili ülkelerin (ABD/Türkiye) finansal danışmanlık düzenlemelerine tabi olmama sınırı netleştirilmeli; BIST verisi için gereken veri lisansı/dağıtım izinleri araştırılmalıdır (bkz. Açık Sorular). |

## 7. Başarı Metrikleri

| Metrik | Hedef Yönü | Karşı-Metrik (Counter-metric) |
|---|---|---|
| Aylık Aktif Kullanıcı (MAU) | Artış | Kullanıcı başına destek/şikayet oranı artmamalı |
| Ücretsiz → Premium dönüşüm oranı | Artış | İlk 30 gün içinde premium iptal oranı düşük kalmalı |
| Kullanıcı başına haftalık izleme listesi / tarama etkileşimi | Artış | Veri doğruluğu şikayeti oranı artmamalı |
| 30 günlük kullanıcı elde tutma (retention) | Artış | — |

## 8. Faz Planı (MVP vs Sonrası)

**⚠️ Kapsam Riski (analist notu):** Kullanıcı tarafında MVP kapsamına "her şeyin dahil olması" yönünde net bir tercih belirtildi (temel analiz + sektör kıyaslaması + geniş teknik indikatör kütüphanesi + otomatik sinyal + gelişmiş çoklu kriter tarama + izleme listesi + portföy + kullanıcı hesabı + kişiselleştirme, iki dilli, freemium ödeme altyapısıyla birlikte). Bu, **solo geliştirici + birkaç aylık hedef** ile birlikte değerlendirildiğinde yüksek risklidir. Aşağıdaki faz ayrımı, kullanıcının önceliklerine (özellikle sektör kıyaslaması ve gelişmiş tarama) sadık kalarak, göreceli olarak daha düşük karmaşıklıklı olan unsurları (ML tabanlı kişiselleştirme, özelleştirilebilir skor ağırlıklandırma, portföy risk analizi, otomatik tarama bildirimleri, SMS) Faz 2'ye ertelemeyi önerir. Bu öneri kullanıcı onayına açıktır (bkz. Bölüm 9).

- **Faz 1 (MVP):** FR-001, 002, 003, 010, 011, 013, 020-024, 030-032, 040-043, 050-052, 060-062, 070, 080-083, 090-091.
- **Faz 2 (öncelik sırasına göre):**
  1. **FR-100, FR-101** (AI destekli hisse yorumu + deterministik grafik örüntü tanıma) — kullanıcı tarafından MVP sonrası **ilk öncelik** olarak belirlendi (bkz. `docs/product-brief-epic9-ai.md`), Epic 9 olarak backlog'a eklendi.
  2. **FR-110, FR-111, FR-112** (Alım-satım simülasyonu/paper trading) — kullanıcı isteği (2026-09-19), Epic 9 ile eş zamanlı, Epic 10 olarak backlog'a eklendi.
  3. **FR-102** (ML tabanlı örüntü tanıma — FR-025'in genişletilmiş hali), FR-012 (özelleştirilebilir skor ağırlıklandırma), FR-033 (tarama bildirimi), FR-053 (portföy risk analizi), FR-063 (gelişmiş kişiselleştirme), FR-071 (SMS) — sıralama arasında henüz kesin öncelik belirlenmedi.
- **Kapsam dışı (şimdilik):** Kripto/döviz varlık sınıfları, sosyal/topluluk özellikleri, gerçek alım-satım emri iletimi (brokerage entegrasyonu).

## 9. Açık Sorular ve Varsayımlar

- **[ASSUMPTION]** Freemium sınırının tam olarak nerede çizileceği (örn. ücretsiz kullanıcıya kaç izleme listesi öğesi / kaç tarama hakkı verileceği) henüz netleşmedi — Faz 1 geliştirme başlamadan önce netleştirilmeli.
- **[ASSUMPTION]** Gerçek zamanlı veri sağlayıcısı (ABD ve BIST için ayrı ayrı) henüz seçilmedi; maliyet, lisans koşulları ve gecikme SLA'sı bu seçime bağlı olarak NFR'leri etkileyecektir.
- **[OPEN QUESTION]** BIST verisi için gereken resmi veri lisansı/dağıtım izni gereksinimleri araştırılmalı (Borsa İstanbul veri yayın politikaları).
- **[OPEN QUESTION]** Bölüm 8'deki faz ayrımı önerisi kullanıcı tarafından onaylanmalı; onaylanmazsa zaman çizelgesinin uzatılması veya ek geliştirici kaynağı gerekebilir.
- **[ASSUMPTION]** Kullanıcı senaryoları (UJ-1, UJ-2) taslak olarak yazılmıştır, gerçek kullanıcı anlatımıyla doğrulanmamıştır.
- **[OPEN QUESTION]** Özet skor/derecelendirme (FR-003) algoritmasının kesin formülü (hangi metriklerin ne ağırlıkla birleştirileceği) tanımlanmalıdır.
- **[OPEN QUESTION — yatırımcı sunumundan önce netleştirilmeli]** ABD/Türkiye'deki yatırım danışmanlığı düzenlemelerine tabi olmama sınırı, FR-100/FR-101/FR-102 (AI yorum + örüntü tanıma/strateji) ile birlikte daha somut hale geldi: "örüntü/sinyal bulgusu" dilinin ("tavsiye" değil) hukuki olarak yeterli bir konumlandırma olup olmadığı bir hukuk danışmanıyla teyit edilmelidir. Bkz. `docs/product-brief-epic9-ai.md`.
- **[OPEN QUESTION — kod incelemesi önerilir]** FR-101 için seçilen üçüncü taraf model (bkz. `docs/product-brief-epic9-ai.md` §"2026-09-18 Güncellemesi") MIT lisanslı ve ticari kullanıma uygun; yine de yatırımcı sunumundan önce ağırlık dosyasının (`best.pt`) kaynağı/bütünlüğü ve modelin kendi eğitim verisinin telif durumu tekrar teyit edilmesi önerilir (üçüncü taraf açık kaynak bir model, dahili olarak eğitilmiş değil).

## 10. Kapsam Dışı (Explicit Out of Scope)

- Gerçek alım-satım emri iletimi / aracı kurum entegrasyonu. (FR-110/111/112'deki simülasyon bu maddenin bir istisnası değil — tamamen sanal bütçe/nakit, hiçbir gerçek emir hiçbir aracı kuruma iletilmiyor.)
- Kripto para, döviz, emtia gibi hisse dışı varlık sınıfları (Faz 1).
- Kullanıcılar arası sosyal etkileşim (yorum, paylaşım, takip) özellikleri.
