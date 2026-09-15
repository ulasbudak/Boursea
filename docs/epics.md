---
title: "Trendus (Borsa Takip Uygulaması) - Epic ve Story Backlog"
status: draft
created: 2026-09-15
updated: 2026-09-15
author: Bob (BMAD Scrum Master)
inputDocuments: ["docs/PRD.md", "docs/architecture.md"]
---

# Trendus — Epic & Story Backlog

## 1. Genel Bakış

Bu doküman, `docs/PRD.md` ve `docs/architecture.md` temel alınarak Faz 1 (MVP) kapsamındaki fonksiyonel gereksinimleri kullanıcı-değeri odaklı epic'lere ve tek bir geliştirici oturumunda tamamlanabilir story'lere ayırır. UX tasarım dokümanı (`bmad-ux`) henüz üretilmediği için bu backlog PRD + Architecture'a dayanır; UX spesifikasyonu hazırlandığında ilgili epiklere UX-DR (UX Design Requirement) satırları eklenmelidir.

## 2. Gereksinim Envanteri

### 2.1 Fonksiyonel Gereksinimler (Faz 1 / MVP kapsamı)

FR-001, FR-002, FR-003, FR-010, FR-011, FR-013, FR-020, FR-021, FR-022, FR-023, FR-024, FR-030, FR-031, FR-032, FR-040, FR-041, FR-042, FR-043, FR-050, FR-051, FR-052, FR-060, FR-061, FR-062, FR-070, FR-080, FR-081, FR-082, FR-083, FR-090, FR-091

*(Tam metinler için bkz. `docs/PRD.md` Bölüm 5.)*

### 2.2 Faz 2 — Bu Backlog Kapsamı Dışında

FR-012 (özelleştirilebilir metrik ağırlıklandırma), FR-025 (ML tabanlı sinyal), FR-033 (tarama bildirimi), FR-053 (portföy risk analizi), FR-063 (gelişmiş kişiselleştirme), FR-071 (SMS bildirim). Bu gereksinimler PRD Bölüm 8'e göre Faz 2'ye ertelenmiştir; aşağıdaki epiklerde ele alınmamıştır.

### 2.3 Fonksiyonel Olmayan Gereksinimler (ilgili story'lerin kabul kriterlerine yansıtılmıştır)

NFR-1 Performans (arama <1sn, gerçek-zamanlı veri birkaç sn içinde), NFR-2 Güvenilirlik (%99.5+ uptime, sessiz hata yok), NFR-3 Veri Doğruluğu/Sorumluluk Reddi, NFR-4 Güvenlik (şifreli veri, JWT), NFR-5 Ölçeklenebilirlik, NFR-6 Platformlar Arası Tutarlılık, NFR-7 Yasal/Uyumluluk.

### 2.4 Mimariden Gelen Ek Gereksinimler

- Monorepo iskeleti: `apps/web` (Next.js), `apps/mobile` (React Native/Expo), `apps/api` (FastAPI) — bkz. `architecture.md` §12.
- Backend OpenAPI şeması → frontend tip üretimi pipeline'ı (AD-2).
- Supabase Auth entegrasyonu ve JWT doğrulama middleware'i (AD-3).
- Piyasa verisi sağlayıcı adaptör arayüzü (`MarketDataProvider`) — AD-5.
- Redis pub/sub tabanlı WebSocket gateway (AD-4).
- Celery + Redis broker ile zamanlanmış işler (AD-8).
- RevenueCat webhook entegrasyonu, entitlement önbelleği (AD-7).
- TradingView Lightweight Charts entegrasyonu — web native, mobil WebView (AD-9).
- Sentry hata izleme, CI/CD (GitHub Actions → Vercel/Railway/EAS).

## 3. FR Kapsam Haritası

| FR | Epic |
|---|---|
| FR-060, FR-090, FR-091, FR-001, FR-002 | Epic 1 |
| FR-010, FR-011, FR-013 | Epic 2 |
| FR-020, FR-021, FR-022, FR-023, FR-024, FR-003 | Epic 3 |
| FR-030, FR-031, FR-032 | Epic 4 |
| FR-040, FR-041, FR-042, FR-043, FR-070 | Epic 5 |
| FR-050, FR-051, FR-052 | Epic 6 |
| FR-061, FR-062 | Epic 7 |
| FR-080, FR-081, FR-082, FR-083 | Epic 8 |

## 4. Epic Listesi

### Epic 1: Kimlik Doğrulama, Hisse Keşfi ve Temel Altyapı
Kullanıcı kayıt olup giriş yapabilir, tercih ettiği dilde uygulamayı kullanabilir, ABD (NYSE/NASDAQ) ve BIST hisselerini arayıp temel genel bakış bilgilerini görebilir. Bu epic aynı zamanda tüm sonraki epiklerin üzerine kurulacağı teknik temeli (monorepo, backend/frontend iskeleti, auth) kurar.
**FRs covered:** FR-060, FR-090, FR-091, FR-001, FR-002

### Epic 2: Temel Analiz (Fundamental)
Kullanıcı, seçtiği hissenin dünya standardı temel analiz metriklerini ve sektör ortalamasına göre konumunu görebilir.
**FRs covered:** FR-010, FR-011, FR-013

### Epic 3: Teknik Analiz ve Özet Değerlendirme Skoru
Kullanıcı interaktif grafik üzerinde geniş bir indikatör kütüphanesi kullanabilir, kural bazlı otomatik sinyaller görebilir ve hissenin temel+teknik verilerin birleşiminden türetilen özet bir değerlendirme skorunu görebilir.
**FRs covered:** FR-020, FR-021, FR-022, FR-023, FR-024, FR-003

### Epic 4: Tarama (Screener) ve Karşılaştırma
Kullanıcı, temel ve teknik kriterleri birleştirerek hisse taraması yapabilir, taramaları kaydedebilir ve birden fazla hisseyi yan yana karşılaştırabilir.
**FRs covered:** FR-030, FR-031, FR-032

### Epic 5: İzleme Listesi, Alarmlar ve Bildirimler
Kullanıcı hisseleri izleme listesine ekleyebilir, fiyat/indikatör bazlı alarm kurabilir ve tetiklenen alarmlar için push/e-posta bildirimi alabilir.
**FRs covered:** FR-040, FR-041, FR-042, FR-043, FR-070

### Epic 6: Portföy Takibi
Kullanıcı sahip olduğu hisseleri portföyüne ekleyip anlık değer ve kâr/zarar durumunu birden fazla portföy üzerinde takip edebilir.
**FRs covered:** FR-050, FR-051, FR-052

### Epic 7: Kişiselleştirme
Kullanıcı ilgi alanına göre öne çıkan hisseleri görebilir ve izlediği hisselere kişisel not ekleyebilir.
**FRs covered:** FR-061, FR-062

### Epic 8: Abonelik ve Monetizasyon (Freemium)
Kullanıcı ücretsiz katmanın sınırlarını görebilir ve premium katmana yükseltip gerçek zamanlı veri/geniş özellik setine erişebilir.
**FRs covered:** FR-080, FR-081, FR-082, FR-083

**Epic bağımsızlığı notu:** Her epic bir öncekinin çıktısını kullanabilir (örn. Epic 3, Epic 2'nin ürettiği temel veri modelini kullanır) ama hiçbir epic sonraki bir epiğin tamamlanmasını beklemez. Epic 8 (Abonelik), Epic 1-7'de üretilen özellik sınırlarını freemium kapıları arkasına yerleştirir ama bu epiklerin fonksiyonelliğini değiştirmez.

---

## 5. Epic 1: Kimlik Doğrulama, Hisse Keşfi ve Temel Altyapı

### Story 1.1: Proje İskeleti ve Temel Altyapı Kurulumu

> Detaylı, geliştirmeye hazır kabul kriterleri için bkz. **`docs/stories/story-1.md`** — bu ilk story, projenin geliştirmeye başlayabilmesi için gereken teknik temeli kurar.

Kısa özet: Monorepo (`apps/web`, `apps/mobile`, `apps/api`), Next.js/FastAPI/Expo iskeletleri, Supabase projesi bağlantısı, temel CI pipeline'ı ve ortam değişkeni yönetimi kurulur.

### Story 1.2: Kullanıcı Kaydı ve Girişi ✅ Tamamlandı

> Detaylı kabul kriterleri ve görev tanımı için bkz. **`docs/stories/story-1.2.md`**. Backend (JWKS tabanlı JWT doğrulama + `/me`), web (`@supabase/ssr` ile e-posta/şifre + Google/Apple OAuth, `/dashboard`) ve mobil (e-posta/şifre ile kayıt/giriş) uygulandı ve doğrulandı. Mobilde native Google/Apple OAuth bilinçli olarak kapsam dışı bırakıldı (bkz. story dosyası — EAS dev-client ve gerçek sağlayıcı kimlik bilgileri gerektiriyor).

As a **yeni kullanıcı**,
I want e-posta veya Google/Apple hesabımla kayıt olup giriş yapabilmek,
So that kişisel izleme listemi, portföyümü ve tercihlerimi kaydedebileyim.

**Acceptance Criteria:**

- **Given** kayıtsız bir ziyaretçi, **When** e-posta ve şifre ile kayıt formunu doldurup gönderirse, **Then** Supabase Auth üzerinde hesap oluşturulur ve kullanıcı oturum açmış olarak yönlendirilir.
- **Given** kayıtlı bir kullanıcı, **When** Google veya Apple ile giriş yaparsa, **Then** OAuth akışı tamamlanır ve mevcut hesabıyla eşleştirilir.
- **Given** geçersiz kimlik bilgileri, **When** kullanıcı giriş yapmaya çalışırsa, **Then** anlaşılır bir hata mesajı gösterilir, hesap kilitlenmez.
- **And** oturum JWT'si her API isteğinde backend middleware'i tarafından doğrulanır (NFR-4); geçersiz/süresi dolmuş token 401 ile reddedilir.

### Story 1.3: Dil Seçimi ve Yerelleştirme Temeli

- [x] **Tamamlandı** — Detaylı kabul kriterleri ve görev tanımı için bkz. **`docs/stories/story-1.3.md`**. Çeviri/biçimlendirme mantığı `packages/shared` altında paylaşılan bir i18n modülüne taşındı; web (`Accept-Language` + cookie + `/settings` sayfası) ve mobil (`expo-localization` + `AsyncStorage` + yeni `SettingsScreen`) uygulandı ve doğrulandı. Dil tercihi, yeni bir backend tablosu eklemeden Supabase `user_metadata` üzerinden kalıcı hale getirildi.

As a **kullanıcı**,
I want uygulama dilini Türkçe veya İngilizce olarak seçebilmek,
So that uygulamayı kendi dilimde rahatça kullanabileyim.

**Acceptance Criteria:**

- **Given** ilk açılış, **When** kullanıcı cihaz/tarayıcı dili Türkçe veya İngilizce ise, **Then** uygulama o dilde açılır; desteklenmeyen bir dilse İngilizce varsayılan olur.
- **Given** ayarlar ekranı, **When** kullanıcı dili değiştirirse, **Then** tüm arayüz metinleri anında seçilen dile döner ve tercih kalıcı olarak kaydedilir (FR-090).
- **And** sayı/para birimi biçimleri (binlik ayraç, TL/USD gösterimi) seçilen dile ve piyasaya göre otomatik uyarlanır (FR-091).

### Story 1.4: Hisse Arama

- [x] **Tamamlandı** — Detaylı kabul kriterleri ve görev tanımı için bkz. **`docs/stories/story-1.4.md`**. Backend (`market_data` modülü: BIST için statik sembol dizini + ABD için Finnhub canlı arama, `GET /symbols/search`), web (`/dashboard` arama kutusu) ve mobil (`HomeScreen` arama) uygulandı ve doğrulandı.

As a **kullanıcı**,
I want sembol veya şirket adına göre ABD ve BIST hisselerini arayabilmek,
So that ilgilendiğim hisseyi hızlıca bulabileyim.

**Acceptance Criteria:**

- **Given** arama kutusu, **When** kullanıcı bir sembol veya şirket adı yazarsa, **Then** eşleşen sonuçlar borsa etiketiyle (NASDAQ/NYSE/BIST) 1 saniyenin altında listelenir (NFR-1).
- **Given** kısmi/hatalı yazım, **When** kullanıcı arama yaparsa, **Then** en yakın eşleşen semboller/şirket adları önerilir.
- **Given** sonuç bulunamaması, **When** arama tamamlanırsa, **Then** kullanıcıya "sonuç bulunamadı" durumu net şekilde gösterilir.

### Story 1.5: Hisse Genel Bakış Kartı

- [x] **Tamamlandı** — Detaylı kabul kriterleri ve görev tanımı için bkz. **`docs/stories/story-1.5.md`**. Backend (`GET /symbols/overview`: ABD için Finnhub `/quote` + `/stock/profile2`, BIST için statik dizin + "veri şu an güncellenemiyor" uyarısı), web (`/stock/[exchange]/[symbol]` sayfası, arama sonuçları bağlandı) ve mobil (`StockOverviewScreen`, arama sonucuna dokunma) uygulandı ve doğrulandı.

As a **kullanıcı**,
I want bir hisseyi açtığımda güncel fiyat, günlük değişim, piyasa değeri ve şirket bilgilerini görmek,
So that hisse hakkında hızlı bir ilk izlenim edinebileyim.

**Acceptance Criteria:**

- **Given** bir hisse detay sayfası, **When** sayfa yüklenirse, **Then** güncel fiyat, günlük değişim (% ve mutlak), piyasa değeri, sektör ve endüstri bilgisi gösterilir.
- **Given** piyasa veri sağlayıcısı geçici olarak erişilemez, **When** veri çekilemezse, **Then** sessiz hata yerine "veri şu an güncellenemiyor" uyarısı gösterilir (NFR-2).
- **And** sayfanın herhangi bir yerinde "yatırım tavsiyesi değildir" ibaresi sabit olarak yer alır (NFR-3, NFR-7).

---

## 6. Epic 2: Temel Analiz (Fundamental)

### Story 2.1: Temel Metriklerin Gösterimi

- [x] **Tamamlandı** — Detaylı kabul kriterleri, mimari yaklaşım ve görev tanımı için bkz. **`docs/stories/story-2.1.md`**. Backend (yeni `fundamentals` modülü: ABD için Finnhub `/stock/metric`, BIST için "veri yok" + uyarı; `GET /fundamentals`), web (hisse detay sayfasına "Genel Bakış"/"Temel Analiz" sekmeleri) ve mobil (`StockOverviewScreen`'e aynı sekmeler) uygulandı ve doğrulandı.

As a **kullanıcı**,
I want bir hissenin F/K, PD/DD, ROE, ROA, EPS, temettü verimi, borç/özsermaye, kâr marjı gibi temel metriklerini görmek,
So that hissenin finansal sağlığını değerlendirebileyim.

**Acceptance Criteria:**

- **Given** hisse detay sayfasının "Temel Analiz" sekmesi, **When** kullanıcı sekmeyi açarsa, **Then** PRD FR-010'da listelenen tüm metrikler güncel değerleriyle gösterilir.
- **Given** bir metrik için veri mevcut değilse, **When** sayfa render edilirse, **Then** metrik "veri yok" olarak işaretlenir, sayfa çökmez.
- **And** metrik değerleri, backend `fundamentals` modülünden gelen normalize edilmiş veri modeline göre gösterilir (mimari AD-5 ile uyumlu).

### Story 2.2: Sektör Kıyaslaması

- [x] **Tamamlandı** — Detaylı kabul kriterleri, mimari yaklaşım ve görev tanımı için bkz. **`docs/stories/story-2.2.md`**. Backend (`GET /fundamentals` yanıtına `sector_comparison` eklendi: Finnhub `/stock/peers` ile emsal şirketler, paralel çekilen metriklerin ortalaması ve `%` fark), web ve mobil (Temel Analiz sekmesindeki her metrik satırına sektör ortalaması + fark gösterimi) uygulandı ve doğrulandı.

As a **kullanıcı**,
I want her metriğin sektör/endeks ortalamasıyla karşılaştırmasını görmek,
So that hissenin sektörüne göre ucuz mu pahalı mı olduğunu anlayabileyim.

**Acceptance Criteria:**

- **Given** temel metrik listesi, **When** her metrik gösterilirse, **Then** yanında sektör ortalaması ve hissenin bu ortalamaya göre konumu (üstünde/altında, % fark) gösterilir (FR-011).
- **Given** hissenin sektör bilgisi eksikse, **When** kıyaslama hesaplanamazsa, **Then** kıyaslama alanı "sektör verisi yok" olarak gösterilir.

### Story 2.3: Geçmiş Finansal Performans Grafiği

- [x] **Tamamlandı** — Detaylı kabul kriterleri, mimari yaklaşım ve görev tanımı için bkz. **`docs/stories/story-2.3.md`**. Backend (yeni `GET /fundamentals/history`: Finnhub `/stock/metric` yanıtının `series` bölümünden hisse başına gelir/net kâr/EPS), web ve mobil ("Temel Analiz" sekmesine yıllık/çeyreklik geçişli, bağımlılıksız bar grafiği bölümü) uygulandı ve doğrulandı. Epic 2 (Temel Analiz) bu story ile tamamlandı.

As a **kullanıcı**,
I want şirketin son 5 yıl/20 çeyreklik gelir, net kâr ve EPS grafiğini görmek,
So that şirketin zaman içindeki finansal trendini değerlendirebileyim.

**Acceptance Criteria:**

- **Given** hisse detay sayfasının temel analiz sekmesi, **When** kullanıcı "Geçmiş Performans" bölümüne gelirse, **Then** son 5 yıl (yıllık) ve son 20 çeyrek (çeyreklik) gelir/net kâr/EPS grafik olarak gösterilir (FR-013).
- **And** kullanıcı yıllık/çeyreklik görünüm arasında geçiş yapabilir.

---

## 7. Epic 3: Teknik Analiz ve Özet Değerlendirme Skoru

### Story 3.1: İnteraktif Fiyat Grafiği

As a **kullanıcı**,
I want mum/çizgi/bar grafik türleri arasında geçiş yapıp farklı zaman dilimlerinde fiyat grafiğini incelemek,
So that fiyat hareketini istediğim şekilde analiz edebileyim.

**Acceptance Criteria:**

- **Given** hisse detay sayfasının "Teknik Analiz" sekmesi, **When** kullanıcı sekmeyi açarsa, **Then** TradingView Lightweight Charts ile mum grafiği varsayılan olarak gösterilir (AD-9).
- **Given** grafik araç çubuğu, **When** kullanıcı grafik türünü (mum/çizgi/bar) veya zaman dilimini (gün içi/günlük/haftalık/aylık) değiştirirse, **Then** grafik anında güncellenir (FR-020).
- **And** grafik hem web hem mobilde aynı veri sözleşmesiyle çalışır (mobilde WebView köprüsü üzerinden).

### Story 3.2: Çekirdek İndikatörler

As a **kullanıcı**,
I want grafiğe SMA/EMA, RSI, MACD, Bollinger Bantları, Hacim, Stokastik gibi çekirdek indikatörleri ekleyebilmek,
So that temel teknik analiz yapabileyim.

**Acceptance Criteria:**

- **Given** grafik indikatör menüsü, **When** kullanıcı bir çekirdek indikatörü seçerse, **Then** indikatör grafiğe overlay/alt panel olarak eklenir (FR-021).
- **Given** birden fazla indikatör eklenmiş, **When** kullanıcı grafiği görüntülerse, **Then** tüm indikatörler okunabilir şekilde bir arada gösterilir.
- **And** kullanıcı eklediği indikatörü tek tıkla kaldırabilir.

### Story 3.3: Geniş İndikatör Kütüphanesi

As a **aktif trader**,
I want ADX, Fibonacci Retracement, Ichimoku, ATR, OBV, Parabolic SAR, Williams %R gibi ileri seviye indikatörlere erişmek,
So that daha derinlemesine teknik analiz yapabileyim.

**Acceptance Criteria:**

- **Given** indikatör kütüphanesi menüsü, **When** kullanıcı "Gelişmiş" kategorisini açarsa, **Then** en az 30 indikatör aranabilir bir liste halinde sunulur (FR-022).
- **Given** bir indikatör seçilir, **When** parametreleri (örn. periyot) varsayılan değerlerle eklenirse, **Then** kullanıcı parametreleri özelleştirebilir.

### Story 3.4: Manuel Çizim Araçları

As a **aktif trader**,
I want grafik üzerine trend çizgisi ve yatay destek/direnç çizgisi çizebilmek,
So that kendi analizimi grafik üzerinde işaretleyebileyim.

**Acceptance Criteria:**

- **Given** grafik çizim araç çubuğu, **When** kullanıcı trend çizgisi aracını seçip grafik üzerinde iki nokta işaretlerse, **Then** çizgi grafiğe eklenir ve kalıcı olarak saklanır (FR-023).
- **Given** yatay çizgi aracı, **When** kullanıcı bir fiyat seviyesine tıklarsa, **Then** o seviyede yatay bir destek/direnç çizgisi eklenir.
- **And** kullanıcı eklediği çizimi seçip silebilir.

### Story 3.5: Kural Bazlı Otomatik Sinyal Üretimi

As a **aktif trader**,
I want RSI/MACD/hareketli ortalama kesişimi gibi hazır kurallara göre otomatik üretilen sinyalleri görmek,
So that manuel taramaya gerek kalmadan potansiyel fırsatları fark edebileyim.

**Acceptance Criteria:**

- **Given** bir hissenin teknik verisi güncellenir, **When** tanımlı kurallardan biri (örn. "RSI 30 altına düştü") sağlanırsa, **Then** backend `technical` modülü bir sinyal kaydı üretir ve hisse detay sayfasında gösterilir (FR-024).
- **Given** sinyal listesi, **When** kullanıcı bir hissenin sinyal geçmişine bakarsa, **Then** son N sinyal, tetiklenme tarihiyle birlikte listelenir.
- **And** sinyal üretimi kural bazlı/deterministiktir; ML tabanlı skorlama bu story kapsamında değildir (bkz. PRD FR-025, Faz 2).

### Story 3.6: Özet Değerlendirme Skoru

As a **yeni/amatör yatırımcı**,
I want karmaşık metriklere girmeden hissenin genel durumunu özetleyen basit bir skor/etiket görmek,
So that hızlıca "bu hisseye bakmaya değer mi" sorusuna yanıt alabileyim.

**Acceptance Criteria:**

- **Given** bir hissenin hem temel (Epic 2) hem teknik (Story 3.1-3.5) verisi mevcut, **When** hisse genel bakış kartı yüklenirse, **Then** 1-100 arası bir skor veya Al/Nötr/Sat etiketi gösterilir (FR-003).
- **Given** temel veya teknik veri eksik, **When** skor hesaplanamazsa, **Then** "yeterli veri yok" durumu gösterilir, hatalı/rastgele bir skor gösterilmez.
- **And** skor açıklaması ("bu skor neye dayanıyor") kullanıcıya bir bilgi ipucu (tooltip) ile sunulur.

---

## 8. Epic 4: Tarama (Screener) ve Karşılaştırma

### Story 4.1: Çoklu Kriter Tarama

As a **aktif trader**,
I want piyasa değeri, F/K, RSI, hacim, sektör, borsa gibi kriterleri birleştirerek hisse taraması yapmak,
So that yatırım kriterlerime uyan hisseleri hızlıca bulabileyim.

**Acceptance Criteria:**

- **Given** tarama ekranı, **When** kullanıcı birden fazla temel+teknik kriteri birlikte ayarlarsa, **Then** tüm kriterlere uyan hisseler bir tabloda listelenir (FR-030).
- **Given** hiçbir hisse kriterlere uymuyorsa, **When** tarama çalıştırılırsa, **Then** "sonuç bulunamadı" durumu gösterilir.
- **And** tarama sonuçları hem ABD hem BIST hisselerini borsa filtresine göre kapsar.

### Story 4.2: Kayıtlı Taramalar

As a **aktif trader**,
I want tarama kriter setimi bir isimle kaydedip tekrar çalıştırabilmek,
So that her seferinde kriterleri yeniden girmek zorunda kalmayayım.

**Acceptance Criteria:**

- **Given** oluşturulmuş bir tarama, **When** kullanıcı "Kaydet" deyip bir isim girerse, **Then** kriter seti kullanıcı hesabına bağlı olarak saklanır (FR-031).
- **Given** kayıtlı taramalar listesi, **When** kullanıcı birini seçerse, **Then** kriterler geri yüklenir ve tarama güncel veriyle yeniden çalıştırılır.
- **And** kullanıcı kayıtlı bir taramayı silebilir veya yeniden adlandırabilir.

### Story 4.3: Hisse Karşılaştırma Tablosu

As a **kullanıcı**,
I want en az 4 hisseyi yan yana temel ve teknik metriklerle karşılaştırmak,
So that hangisinin daha iyi bir seçim olduğuna karar verebileyim.

**Acceptance Criteria:**

- **Given** karşılaştırma ekranı, **When** kullanıcı 2-4 arası hisse eklerse, **Then** seçilen hisselerin temel ve teknik metrikleri yan yana bir tabloda gösterilir (FR-032).
- **Given** karşılaştırma tablosu, **When** bir metrikte bir hisse diğerlerinden belirgin şekilde iyi/kötü ise, **Then** bu görsel olarak vurgulanır (örn. renk kodlaması).
- **And** kullanıcı karşılaştırmadan bir hisseyi çıkarabilir.

---

## 9. Epic 5: İzleme Listesi, Alarmlar ve Bildirimler

### Story 5.1: İzleme Listesi Oluşturma ve Yönetimi

As a **kullanıcı**,
I want takip etmek istediğim hisseleri bir veya birden fazla izleme listesine eklemek,
So that ilgilendiğim hisseleri tek yerden takip edebileyim.

**Acceptance Criteria:**

- **Given** bir hisse detay sayfası, **When** kullanıcı "izleme listesine ekle" butonuna basarsa, **Then** hisse seçilen (veya varsayılan) izleme listesine eklenir (FR-040).
- **Given** birden fazla izleme listesi, **When** kullanıcı yeni bir liste oluşturursa, **Then** listeye istediği ismi verebilir ve hisseleri buna dağıtabilir.
- **And** kullanıcı bir hisseyi izleme listesinden kaldırabilir.

### Story 5.2: Fiyat Alarmı Kurma

As a **kullanıcı**,
I want bir hisse için fiyat eşiği bazlı alarm kurmak,
So that fiyat belirlediğim seviyeye ulaştığında haberdar olabileyim.

**Acceptance Criteria:**

- **Given** bir hisse detay sayfası, **When** kullanıcı "fiyat üstüne/altına düşerse bildir" alarmı kurarsa, **Then** alarm backend `alerts` modülünde kaydedilir (FR-041).
- **Given** aktif bir fiyat alarmı, **When** piyasa fiyatı eşiği geçerse, **Then** alarm bir kez tetiklenir ve durumu "tetiklendi" olarak güncellenir.
- **And** kullanıcı aktif alarmlarını listeleyip silebilir.

### Story 5.3: İndikatör/Sinyal Alarmı Kurma

As a **aktif trader**,
I want RSI/MACD gibi bir indikatör koşuluna göre alarm kurmak,
So that manuel takip etmeden teknik sinyalleri kaçırmayayım.

**Acceptance Criteria:**

- **Given** bir hisse detay sayfası, **When** kullanıcı "RSI 70 üstüne çıkarsa bildir" gibi bir kural seçerse, **Then** alarm kaydedilir (FR-042).
- **Given** aktif bir indikatör alarmı, **When** Story 3.5'teki sinyal motoru ilgili koşulu tetiklerse, **Then** alarm devreye girer.

### Story 5.4: Alarm Bildirimleri — Push ve E-posta

As a **kullanıcı**,
I want bir alarm tetiklendiğinde push bildirimi ve/veya e-posta almak,
So that uygulamayı açık tutmadan haberdar olabileyim.

**Acceptance Criteria:**

- **Given** tetiklenen bir alarm, **When** kullanıcı mobil uygulamayı yüklemişse, **Then** Expo Push ile anlık bildirim gönderilir (FR-043, FR-070).
- **Given** kullanıcı e-posta bildirimini açık bırakmışsa, **When** alarm tetiklenirse, **Then** Resend üzerinden bir e-posta gönderilir.
- **And** kullanıcı bildirim tercihlerini (push/e-posta/ikisi de) ayarlardan değiştirebilir.

---

## 10. Epic 6: Portföy Takibi

### Story 6.1: Portföy Oluşturma ve Pozisyon Ekleme

As a **kullanıcı**,
I want sahip olduğum hisseleri adet ve maliyet fiyatıyla portföyüme eklemek,
So that gerçek yatırımlarımı uygulama üzerinden takip edebileyim.

**Acceptance Criteria:**

- **Given** portföy ekranı, **When** kullanıcı bir hisse için adet ve maliyet fiyatı girerse, **Then** pozisyon portföyüne eklenir (FR-050).
- **Given** var olan bir pozisyon, **When** kullanıcı ek alım/satım girerse, **Then** ortalama maliyet yeniden hesaplanır.
- **And** kullanıcı bir pozisyonu silebilir.

### Story 6.2: Portföy Değeri ve Kâr/Zarar Hesaplama

As a **kullanıcı**,
I want portföyümün anlık toplam değerini ve pozisyon bazlı kâr/zararımı görmek,
So that yatırım performansımı takip edebileyim.

**Acceptance Criteria:**

- **Given** portföy ekranı, **When** güncel fiyatlar değişirse, **Then** toplam portföy değeri ve her pozisyonun kâr/zararı (TL/USD ve %) güncellenir (FR-051).
- **Given** bir pozisyonun güncel fiyatı çekilemezse, **When** hesaplama yapılırsa, **Then** o pozisyon "veri güncellenemiyor" olarak işaretlenir, toplam yanlış gösterilmez.

### Story 6.3: Çoklu Portföy Desteği

As a **kullanıcı**,
I want birden fazla portföy (örn. "ABD hisseleri", "BIST uzun vade") oluşturmak,
So that farklı yatırım stratejilerimi ayrı ayrı takip edebileyim.

**Acceptance Criteria:**

- **Given** portföy yönetimi ekranı, **When** kullanıcı yeni bir portföy oluşturursa, **Then** istediği isimle ayrı bir portföy açılır (FR-052).
- **Given** birden fazla portföy, **When** kullanıcı portföyler arasında geçiş yaparsa, **Then** her portföyün kendi pozisyonları ve toplamı ayrı gösterilir.

---

## 11. Epic 7: Kişiselleştirme

### Story 7.1: İlgi Profili ve Öne Çıkanlar

As a **kullanıcı**,
I want ilgilendiğim sektör/hisseleri işaretlemek,
So that ana ekranda bana uygun öne çıkan hisseleri görebileyim.

**Acceptance Criteria:**

- **Given** profil ayarları, **When** kullanıcı ilgi alanı sektörlerini seçerse, **Then** tercih kaydedilir (FR-061).
- **Given** kayıtlı ilgi profili, **When** kullanıcı ana ekranı açarsa, **Then** seçilen sektörlerden kural bazlı olarak öne çıkan (örn. günün en çok hareket edenleri) hisseler gösterilir.

### Story 7.2: Hisseye Kişisel Not Ekleme

As a **kullanıcı**,
I want izlediğim bir hisseye kendi notumu eklemek,
So that o hisseyle ilgili düşüncelerimi/kararlarımı hatırlayabileyim.

**Acceptance Criteria:**

- **Given** bir hisse detay sayfası, **When** kullanıcı not alanına metin girip kaydederse, **Then** not kullanıcıya özel olarak saklanır (FR-062).
- **Given** daha önce eklenmiş bir not, **When** kullanıcı sayfayı tekrar açarsa, **Then** notu görür ve düzenleyebilir/silebilir.

---

## 12. Epic 8: Abonelik ve Monetizasyon (Freemium)

### Story 8.1: Ücretsiz/Premium Katman Ayrımının Uygulanması

As a **ücretsiz kullanıcı**,
I want hangi özelliklerin ücretsiz hangilerinin premium olduğunu net şekilde görmek,
So that yükseltme yapmadan önce ne kazanacağımı bileyim.

**Acceptance Criteria:**

- **Given** ücretsiz katmandaki bir kullanıcı, **When** premium bir özelliğe (örn. gerçek zamanlı veri, geniş indikatör kütüphanesi, sınırsız tarama/alarm) erişmeye çalışırsa, **Then** özellik kilitli gösterilir ve yükseltme teklifiyle karşılaşır (FR-080, FR-081, FR-082).
- **Given** ücretsiz katman, **When** kullanıcı fiyat verisine bakarsa, **Then** verinin gecikmeli/günlük olduğu açıkça belirtilir.
- **And** erişim kontrolü her zaman backend'in önbelleğe aldığı entitlement durumundan çözülür, istemci kendi kendine "premium'um" diyemez (AD-7).

### Story 8.2: Premium Abonelik Satın Alma ve Yönetimi

As a **kullanıcı**,
I want uygulama içinden premium abone olup aboneliğimi yönetmek,
So that gerçek zamanlı veri ve gelişmiş özelliklere erişebileyim.

**Acceptance Criteria:**

- **Given** yükseltme ekranı, **When** kullanıcı bir plan seçip satın alma işlemini tamamlarsa (App Store/Play Store IAP veya web'de Stripe), **Then** RevenueCat üzerinden entitlement güncellenir ve kullanıcı anında premium özelliklere erişir (FR-083).
- **Given** aktif bir abonelik, **When** kullanıcı iptal ederse, **Then** mevcut dönem sonuna kadar premium erişim devam eder, sonrasında ücretsiz katmana döner.
- **And** abonelik durumu (plan, yenilenme tarihi) ayarlar ekranında görüntülenir.

---

## 13. Sonraki Adımlar

1. Bu backlog kullanıcı tarafından gözden geçirilip epik sıralaması/story kapsamı onaylanmalı.
2. `docs/stories/story-1.md` (Epic 1, Story 1.1) ilk geliştirme adımı olarak hazır — geliştirme buradan başlayabilir.
3. Her story tamamlandıkça bu dokümandaki durum güncellenmeli veya `bmad-sprint-planning` ile bir `sprint-status.yaml` takip dosyası oluşturulmalı.
4. UX tasarımı (`bmad-ux`) yapıldığında ilgili epiklere UX-DR satırları eklenmeli.
