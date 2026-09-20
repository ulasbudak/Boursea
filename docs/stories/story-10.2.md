---
title: "Story 10.2: Simülasyon Emir Formunda Sembol Otomatik Tamamlama"
epic: "Epic 10 — Alım-Satım Simülasyonu (Paper Trading)"
story_id: "10.2"
status: done
created: 2026-09-20
updated: 2026-09-20
author: "Claude (retroaktif olarak belgelendi — kod 2026-09-19'da, bu story dosyası açılmadan yazılmıştı)"
based_on: ["docs/stories/story-10.1.md", "commit cd19c44"]
depends_on: ["10.1"]
---

# Story 10.2: Simülasyon Emir Formunda Sembol Otomatik Tamamlama

## Kullanıcı Hikayesi

As a **kullanıcı**,
I want simülasyon emir formundaki sembol alanına yazarken dashboard/karşılaştırma ekranlarındaki gibi öneri listesi görmek,
So that tam sembol kodunu ezbere bilmeden, şirket adıyla arayarak doğru sembolü ve borsayı seçebileyim.

*(Kaynak: bu story önceden tanımlanmış bir FR'ye dayanmıyor — Story 10.1'in emir formunun küçük bir UX eksiğini kapatan, kullanıcının 2026-09-19'da doğrudan koda yazdırdığı bir iyileştirme. Bu dosya [[project_bmad_workflow]] anısındaki "retroaktif story eksikliği" bulgusunu kapatmak için sonradan (2026-09-20) yazıldı.)*

## Bağlam

Story 10.1'in emir formu (`PlaceOrderForm`, hem web `simulation-view.tsx` hem mobil `SimulationScreen.tsx`), sembol alanını çıplak bir metin girişi olarak bıraktı — kullanıcı tam sembol kodunu (örn. "AAPL") elle yazmak zorundaydı, dashboard ve karşılaştırma (`/compare`) ekranlarında zaten var olan şirket-adıyla-arama önerisi burada yoktu. Bu story, aynı `GET /symbols/search` uç noktasını (yeni bir backend değişikliği yok) kullanan, uygulamanın başka yerlerinde zaten kanıtlanmış debounce'lu öneri deseninin emir formuna taşınmasından ibaret — saf bir frontend işi.

## Kapsam

- **Web (`apps/web/src/app/simulation/simulation-view.tsx`):** `PlaceOrderForm`'un sembol `Input`'una, 300ms debounce'lu `/symbols/search` çağrısı yapan bir öneri açılır listesi eklendi (`AbortController` ile önceki isteği iptal ederek); bir öneriye tıklamak hem `symbol` hem `exchange` state'ini birlikte doldurur. Odak kaybında (`onBlur`) listenin hemen kapanmaması için 150ms gecikme.
- **Mobil (`apps/mobile/screens/SimulationScreen.tsx`):** Aynı desen, `EXPO_PUBLIC_API_URL` ile.
- **i18n:** `symbolSearching` ("Aranıyor…" / "Searching…") anahtarı eklendi (`packages/shared/src/i18n/{types.ts, messages/tr.ts, messages/en.ts}`).

**Kapsam dışı:**
- Backend değişikliği — `GET /symbols/search` zaten mevcuttu (dashboard/compare'de kullanılıyordu), bu story yalnızca mevcut uç noktayı yeni bir yüzeyden tüketiyor.
- Klavye ile öneri listesinde gezinme (yukarı/aşağı ok tuşları) — yalnızca fare/dokunma ile seçim var, dashboard/compare'deki mevcut desenle aynı sınırlama.

## Görevler

1. **[Web]** `PlaceOrderForm`'a debounce'lu sembol arama + öneri açılır listesi + seçimde `symbol`+`exchange` doldurma. ✅
2. **[Mobil]** Aynı davranış `SimulationScreen.tsx`'te. ✅
3. **[i18n]** `symbolSearching` anahtarı üç dosyada (`types.ts`, `tr.ts`, `en.ts`). ✅

## Kabul Kriterleri

**AC1 — Öneri listesi**
- **Given** emir formundaki sembol alanı, **When** kullanıcı bir şirket adı veya sembol parçası yazarsa, **Then** 300ms sonra `/symbols/search` sonuçları bir açılır liste olarak gösterilir; arama sürerken "Aranıyor…" durumu görünür.

**AC2 — Seçim, sembol+borsayı birlikte doldurur**
- **Given** öneri listesi açık, **When** kullanıcı bir sonuca tıklarsa, **Then** hem sembol hem borsa alanı o sonucun değerleriyle doldurulur ve liste kapanır.

**AC3 — Yarışan istekler iptal edilir**
- **Given** kullanıcı hızlıca yazmaya devam eder, **When** yeni bir arama tetiklenirse, **Then** önceki bekleyen istek (`AbortController`) iptal edilir — eski bir sonucun geç gelip güncel yazıyı ezmesi engellenir.

## Definition of Done

- [x] AC1–AC3 koda yazıldı (kod incelemesiyle doğrulandı; bu davranış için özel bir otomatik test eklenmedi — dashboard/compare'deki aynı desen de test edilmemişti, tutarlı).
- [x] Web: typecheck, lint, build yeşil (2026-09-20'de genel proje taramasıyla doğrulandı).
- [x] Mobil: typecheck, lint yeşil (2026-09-20'de genel proje taramasıyla doğrulandı).
- [ ] Gerçek tarayıcıda/cihazda görsel doğrulama — kullanıcı bizzat denemeli.

## Teknik Notlar

- **Yeni bir desen değil:** Bu story, dashboard ve `/compare`'de zaten var olan debounce+`AbortController` sembol arama desenini üçüncü bir yüzeye (emir formu) kopyalıyor; backend veya veri modeli değişikliği yok.
- **Retroaktif belgeleme notu:** Bu story dosyası, kodun yazılmasından bir gün sonra (2026-09-20) açıldı — [[project_bmad_workflow]] anısında işaretlenen "son 4 özellik BMAD sürecinin dışında kalmış" bulgusunun bir parçası.
