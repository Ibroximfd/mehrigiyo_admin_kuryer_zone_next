# Backend va egasiga savollar — `mehrigiyo_admin_next` va bosh kuryer ish joyi (2026-10-30)

**Tekshirildi** (faqat o'qib): `mehrigiyo_admin_next` repo, qo'llanma (`FRONTEND_TOLIQ_QOLLANMA_2026_10_30`, §C) va test server.
Test server tokensiz tekshirildi: 401 = endpoint bor, 404 = yo'q.

## 0. Topilma — bu ilova bosh kuryer uchun emas 🔴

`mehrigiyo_admin_next` — **super-admin** («Hududiy yetkazish boshqaruvi») veb-adminkasi.
- **Kirish:** `POST /api/admin/login/`, faqat `is_staff` / superuser. Logist yoki bosh kuryer tokeni bilan `/api/admin/*` → `403`.
- **Kodda bosh kuryer yo'q:** `chief_courier`, `/chief/*` va `permissions` haqida bitta ham satr yo'q.
- **Bo'limlar:** umumiy ko'rsatkichlar, zonalar (hamma viloyat), tumanlar, kuryerlar (yaratish, parol, faollik), viloyat avto-taqsimlash rejimi, filiallararo naqd hisoboti.
- **Shartnoma:** `docs/HUDUD_ADMIN_WEB_QOLLANMA.md` (2026-10-15) — bosh kuryer qo'llanmasidan (2026-10-30) oldin yozilgan.
- **Tarix:** bitta commit (`57e5f00`, 2026-10-21), shundan beri o'zgarmagan.

**Bosh kuryerning kerakli ishlari — qayerda:**

| Ish | admin_next | Logist sayti `/chief` (bosh kuryer bo'limi) |
|---|---|---|
| O'z kuryerini yaratish (akkaunt bilan) | admin yo'li (`/api/admin/couriers/`, hamma viloyat) | ✅ `POST /chief/couriers/`, `attach` va `detach` bilan |
| Viloyatda zona yaratish | admin yo'li (`/api/admin/zones/`) | ✅ `/chief/zones/` |
| Kuryerni zonaga biriktirish | admin yo'li | ✅ `zone_ids` |
| Logistdan kelgan zakazlar | ❌ yo'q | ✅ `/chief/orders/?scope=incoming` |
| Kuryerga taqsimlash (qo'lda, avto) | ❌ yo'q | ✅ `candidates`, `assign`, `auto-assign` |
| Kassa (kuryer → bosh kuryer → bosh logist) | ❌ yo'q | ✅ `/chief/cash/`, `cash/handover/` |
| Kuryer statistikasi (manzil, atkaz, haqi) | ❌ (faqat bugungi soni) | ✅ `/chief/stats/` (`addresses`, `pay_rate`, `pay`) |

Qo'llanma §C: bosh kuryer avtomatik `is_logist` oladi, **logist saytiga** kiradi va «Bosh kuryer» bo'limini ko'radi (`GET /chief/me/` 200).

## 1. Egasiga savollar ❔

- **O1.** «Bosh kuryer `mehrigiyo_admin_next` da ishlaydi» deganda qaysi biri nazarda tutilgan?
  - **(a)** Bosh kuryer **logist saytidagi «Bosh kuryer» bo'limida** ishlaydi. Qo'llanma bo'yicha ham shunday, kod tayyor.
    `admin_next` esa faqat super-admin vositasi bo'lib qoladi.
  - **(b)** `admin_next` ga bosh kuryer rolini qo'shish kerak: logist tokeni bilan kirish va `/chief/*` endpointlari.
    Bu logist saytidagi bo'limning dublikati bo'ladi, ikkalasini birga yuritish kerak bo'ladi.

  **Tavsiya:** (a). Ish joyi bitta bo'ladi, kod tayyor, testda endpointlar bor.
- **O2.** `admin_next` ga kim kiradi: faqat dasturchi yoki super-admin (`is_staff`)mi? Bosh logist ham kiradimi?
  Bosh logist kirsa, uning kerakli ishlari (zona, tuman, viloyat rejimi) logist saytida ham bo'lishi kerakmi?
- **O3.** Bir manzil narxini (`pay_rate`) qayerda belgilash kerak: logist saytida (bosh logist) yoki `admin_next` da (super-admin)?
  Rollar savollaridagi I.4 bilan bir xil savol.

## 2. Backend'ga savollar ❔

- **B1. Bir xil yozuvlarmi.** `/api/operator/chief/couriers|zones` va `/api/admin/couriers|zones` bir xil yozuvlar ustida ishlaydimi?
  Super-admin bosh kuryer kuryerini tahrirlasa, `chief` maydoni saqlanib qoladimi?
  Admin bosh kuryer zonasini o'zgartira oladimi (`zone_other_region` qoidasi adminga ham tegadimi)?
- **B2. Prod.** `/api/operator/chief/*` prodda (`my.imorganic.uz`) **404**, faqat testda bor. Prodga qachon chiqadi?
- **B3. Login xatosi.** `POST /api/admin/login/` bo'sh `{}` bilan **500** qaytaradi. `400 validation_error` kutilgan edi.
- **B4. Token yangilash.** `admin_next` token yangilash uchun `POST /api/token/refresh/` chaqiradi — u testda ham, prodda ham **404**.
  Logist va CRM `POST /api/user/refresh/` ishlatadi. `admin_next` uchun ham shu yo'l to'g'rimi?
- **B5. Stavka.** Bir manzil narxi qaysi endpointda belgilanadi? Viloyat yoki filial bo'yicha farq qiladimi? Rollar savollaridagi I.4 va sklad savollaridagi S4.1 ga qarang.
- **B6. Pul zanjiri.** Bosh kuryer kuryerdan pul qabul qilishi (`/logist/cod/handovers/` yoki `/chief/cash/`) qaysi yo'l bilan?
  Kassa zanjiri: kuryer → bosh kuryer → bosh logist. Ikki pog'onaning endpointlari kerak.

## 3. `admin_next` dagi texnik kamchiliklar (frontend tuzatadi, egasi tasdiqlasa)

- **Token yangilash.** `AUTH_PATHS.refresh` = `/api/token/refresh/` (404) — `user/refresh/` ga almashtirish kerak. Aks holda access token muddati tugaganda sessiya uziladi.
- **Sukut server.** `config/servers.mjs` da `DEFAULT_SERVER = "prod"`, lekin README va izoh «sukut — test» deydi.
- **Dublikat.** Agar O1 = (a) bo'lsa, `admin_next` dagi kuryer va zona CRUD faqat super-admin uchun qoladi.
  Bosh kuryer uchun UI logist saytidagi `/chief` bo'limida.
