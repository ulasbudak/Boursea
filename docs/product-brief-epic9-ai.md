---
title: "Epic 9 — AI Destekli Yorum ve Örüntü Tanıma: Karar Notu"
status: draft
created: 2026-09-16
updated: 2026-09-16
author: Mary (BMAD Business Analyst) — Serdar Ulaş Budak ile birlikte
relatedDocs: ["docs/PRD.md §5.11, §8, §9", "docs/epics.md §13 (Epic 9)"]
---

# Epic 9 — AI Destekli Yorum ve Örüntü Tanıma: Karar Notu

## Bağlam

Bu doküman, mevcut Faz 1 MVP backlog'u (Epic 1-8) tamamlandıktan sonra eklenecek bir genişleme için yapılan keşif görüşmesinin gerekçesini kayıt altına alır. Trendus **yatırımcıya açılacak** bir proje olduğundan, burada alınan kararlar — özellikle regülasyon riski — yatırımcı sunumundan önce netleştirilmelidir.

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
