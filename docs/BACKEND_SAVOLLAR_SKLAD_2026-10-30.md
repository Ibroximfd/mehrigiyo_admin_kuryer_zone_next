# Backend'ga savollar — Sklad, Moliya, Analitika: ishlash prinsipi va yangi rollar bilan moslash (2026-10-30)

**Manba:** `mehrigiyo_platform_tz/18_SKLAD_MOLIYA_ANALITIKA_BACKEND_TZ.md` (TZ 18, 2026-10-28/29).
**Frontend tayyor:** logist sayti — Sklad, Moliya, Analitika, AI tahlil; CRM — Sklad (faqat ko'rish); kuryer ilovasi — «Menda nima bor», olish, topshirish.

## 0. Test serverdagi holat (tokensiz tekshiruv, 2026-10-30)

**Mavjud (401):**
- sklad: `/sklad/me|regions|locations|items|stock|ledger|documents|overview|couriers|grants`;
- moliya: `/sklad/finance/*`;
- analitika va AI: `/sklad/analytics/funnel`, `/sklad/ai/*`;
- CRM: `/sklad/crm/overview|regions/{code}`;
- kuryer ilovasi: `/courier/warehouse/stock|locations|items|history|load|return`.

**Yo'q (404):**
- `GET /sklad/filials/` — dopusk oynasi filiallarni shu yerdan oladi.

**❔ S0.1.** Sklad testda **to'liq ishga tushganmi**?
- Migratsiyalar, viloyat omborlari, qoldiq nazorati yoqilgan mahsulotlar, `Filial.is_main` — bular qilinganmi?
- Avtomatik harakatlar (§5) va `/ws/sklad/` ishlayaptimi?
- Yo'q bo'lsa — nimasi qoldi va qachon chiqadi?

**❔ S0.2.** Testda qaysi akkaunt `logist.main` (asosiy filial)? Qaysi mahsulotlarda qoldiq nazorati yoqilgan?

---

## 1. Rollar: TZ 18 va yangi tuzilma (B2) bir-biriga mos emas 🔴

| | TZ 18 | B2 (2026-10-30) |
|---|---|---|
| Kim yozadi | `logist.main` — `Filial.is_main` dagi logist | rol `chief_logist` + dopusklar |
| Boshqa filial | `logist.branch` + mahsulot dopuski (`/sklad/grants/`) | `logist` + dopusklar |
| Bosh kuryer | yo'q | `chief_courier`, dopusk `warehouse.view_courier_stores` (faqat o'qish) |

**❔ Savollar:**
- **S1.1.** Endi qaysi biri haqiqat manbai? Taklif: `logist.main` = `chief_logist` rolli logist, `/sklad/me/` shundan chiqsin.
  `Filial.is_main` ga bog'liqlik qoladimi?
- **S1.2.** Mahsulot dopuski (`/sklad/grants/`, filial bo'yicha) qoladimi? Yoki B2 dopuski (masalan `warehouse.manage`) bilan almashadimi?
- **S1.3.** Bosh kuryer skladda nima qiladi?
  - `warehouse.view_courier_stores` — faqat o'z kuryerlari omborini ko'rishmi?
  - Bosh kuryer kuryerga mol bera oladimi (`courier_load`)? Kuryerdan qabul qila oladimi?
  - Uning endpointlari qaysi: `/sklad/...` yoki `/chief/...`?

## 2. Mol qayerdan qayerga yuradi — zanjirni tasdiqlang 🔴

TZ 18 bo'yicha: **ishlab chiqarish → viloyat ombori → kuryer → mijoz**. Markaziy sklad va tranzit yo'q.

Yangi tuzilmada bosh kuryer bor. **❔ S2.1.** Zanjir qaysi?
- **(a)** Viloyat ombori → kuryer. Bosh kuryer faqat taqsimlaydi va ko'radi.
- **(b)** Viloyat ombori → bosh kuryer ombori → kuryer. Bosh kuryerning o'z ombori (`Location kind=chief`) bormi?
- **(c)** Viloyat omborini bosh kuryer yuritadi: kirim va kuryerga berish.

**❔ S2.2.** Kuryer moli kimdan va qanday oladi?
- Ilovadan o'zi: `POST /courier/warehouse/load/` — darhol kuchga kiradi.
- Yoki logist yoki bosh kuryer beradi, kuryer tasdiqlaydimi?

**❔ S2.3.** Kirimni kim qiladi: faqat asosiy logistmi (bosh logist)? Viloyat bosh kuryeri kirimni qabul qiladimi?

## 3. Avtomatik harakatlar «Jarayonda» oqimi bilan 🔴

TZ 18 §5: `delivered` bo'lganda kuryer omboridan `sale −N` yoziladi.

Yangi oqim (A, K1): kuryer «yetkazdim» deydi → zakaz `shipping` + `courier_outcome=delivered` («Jarayonda») → **logist tasdiqlaydi** → `delivered`.

**❔ Savollar:**
- **S3.1.** Sklad minusi qachon yoziladi: logist tasdiqlaganda (`delivered`) yoki kuryer «yetkazdim» deganda?
  Taklif: logist tasdiqlaganda — atkazga aylansa qaytarish kerak bo'lmaydi.
- **S3.2.** `delivered → shipping` qaytarilsa (logist xato bosgan) — `sale` teskarisi yoziladimi?
- **S3.3.** Kuryersiz, faqat bosh kuryerga berilgan zakaz (`courier: null`, `chief_courier`) yetkazildi deb yopilsa, mol qaysi ombordan kamayadi?
  `is_primary` dan yoki bosh kuryernikidanmi?
- **S3.4.** Manzil sonini o'zgartirish (`orders/{id}/addresses/`) skladga ta'sir qilmaydi — to'g'rimi?

## 4. Moliya: uchta qoida bir-biriga mos emas 🔴

**Logistika xarajati:**
- TZ 18 §7.1: `logistics_per_order` (70 000) — 2026-10-29 dan «har manzilga» ma'nosida, `logistics = stavka × manzil`.
- Statistika va bosh kuryer: `pay_rate` / `courier_pay_rate` (misollarda 70 000 va 15 000), kuryer haqi = manzil × `pay_rate`.

**Operator foizi:**
- TZ 18 §7.1: `operator_percent` hammaga 6%.
- B5: haftalik pog'onali shablon, `WeeklyPayout`.
- Egasi: individual foiz yo'q, Pervichka va Baza uchun alohida.

**❔ Savollar:**
- **S4.1.** `logistics_per_order` (Moliya sozlamasi) va `pay_rate` (kuryer haqi) — **bitta son**mi? Bitta bo'lishi kerak:
  bosh logist «bir manzil narxi» ni belgilaydi, kuryer haqi ham, Moliyadagi logistika xarajati ham shundan.
  Viloyat bo'yicha farq qiladimi? Bu rollar savollaridagi I.4 bilan bir xil savol.
- **S4.2.** Moliyadagi `operator_fee` endi pog'onali shablon (B5) bo'yicha hisoblanadimi?
  `operator_percent` sozlamasi olib tashlanadimi? Hafta yopilmaguncha (dastlabki pog'ona) Moliya qaysi foizni ko'rsatadi?
- **S4.3.** `remaining = revenue − operator_fee − logistics`. Bosh kuryer yoki logist haqi alohida ayiriladimi?
- **S4.4.** Kuryer haqini «to'landi» qilish (kassa, haftalik yoki oylik) — sklad moliyasidami yoki logist kassasidami?

## 5. Statistika va analitika — viloyat → bosh kuryer → kuryer

**❔ Savollar:**
- **S5.1.** `/sklad/analytics/*` va `/sklad/finance/*` da `?region=` va `?chief=` filtrlari bormi? Hozir faqat `?filial=`.
  Egasi viloyat va bosh kuryer kesimini so'rayapti.
- **S5.2.** Bosh kuryer o'z viloyati bo'yicha Moliya va Analitikani ko'radimi? `view.analytics` sukutda bor. Qaysi endpoint, qanday qamrov?

## 6. Qolganlari

- **S6.1.** `GET /sklad/filials/` — 404, chiqarilsin. Yoki filiallarni qayerdan olish kerakligini ayting.
- **S6.2.** CRM sotuvchisi buyurtma kartasida qoldiqni qaysi ombordan ko'radi: zakaz viloyatining omboridan, bosh kuryer omboridan yoki kuryernikidan?
- **S6.3.** `Idempotency-Key` hamma sklad yozuvida ishlayaptimi? Kuryer ilovasining oflayn navbati shunga tayanadi.
- **S6.4.** TZ 18 §14 dagi ochiq savollar (`returned` holati, lid manbai) — javoblari qanday?

## 7. Bizdan keyin (javob kelgach)

- Frontendda rollar (`logist.main` → `chief_logist`), «bir manzil narxi» sozlamasi, viloyat va bosh kuryer filtrlari moslanadi.
- Testda ssenariy: kirim → kuryerga berish → zakaz → yetkazildi (tasdiq) → kuryerdan minus → Moliya (tushum, foiz, logistika) → kuryer haqi.
  Natija rol bo'yicha ✅/❌ bilan yoziladi.
