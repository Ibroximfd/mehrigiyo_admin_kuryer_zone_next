# Backend'ga savollar — rollar va ishga tushirish (CRM va logistika), 2026-10-30

**Maqsad.** CRM va logist saytini **to'liq ishga tushirish**. Har rol nima qiladi, qanday qiladi va kim beradi — shuni yakuniy aniqlab olamiz.

Quyida har rol uchun uchta qism bor:
- **Qo'llanmada** — `FRONTEND_TOLIQ_QOLLANMA_2026_10_30` (§E, §F, §C, §H, §K) da yozilgani.
- **Frontendda** — bizda qilingani.
- **❔ Savollar** — backend javobi kerak bo'lgan joylar.

Javobni har savol raqami bilan yozinglar (masalan «A3: …»).

---

## 0. Ishga tushirish tartibi (taklif) — tasdiqlang ❔

1. **Bosh admin va bosh logist.** Backend har zonaga birinchi bosh admin va bitta bosh logist beradi:
   - `grant_staff_role --role zone_admin --zone <id> --apply`;
   - `grant_staff_role --role chief_logist --all --apply`.
2. **Bosh admin (CRM → «Tuzilma»):**
   - bo'limlarni tekshiradi (Pervichka-1, Baza-1);
   - bo'limlarga admin tayinlaydi;
   - o'rinlar ochadi;
   - «Foiz» da Pervichka va Baza shablonini kiritadi.
3. **Bosh logist (logist sayti):**
   - «Logistlar» da logistlarni ochadi va ularga dopusk beradi;
   - «Kuryerlar → Bosh kuryerlar» da har viloyatga bosh kuryer tayinlaydi.
4. **Bosh kuryer (logist sayti → «Bosh kuryer»):** o'z kuryerlarini qo'shadi, zonalarini belgilaydi va zakazlarni taqsimlaydi.
5. **Bayroqlar.** Egasi `ORDER_CHAT_MEMBERSHIP`, `OPERATOR_CANCEL_NEEDS_LOGIST_REVIEW` va kerakli bo'limlarda `handover_enabled` ni yoqadi.

**❔ 0.1.** Shu tartib to'g'rimi? Prodda nimalar bir marta qo'lda qilinadi (buyruqlar, migratsiyalar, bayroqlar)? To'liq ro'yxat kerak.
**❔ 0.2.** Testda qaysi akkauntlarga qaysi rol berilgan? Bizga har rol uchun bittadan test akkaunt kerak:
`zone_admin`, `department_admin`, `seller`, `chief_logist`, `logist`, `chief_courier`.
Login va parol chatda emas — alohida yo'l bilan beriladi.

---

## A. CRM bosh admini (`zone_admin`, qamrov `zone` yoki `all`)

**Qo'llanmada (§E.0):**
- Sukut dopusklar: bo'lim admini dopusklari + `lead.move_department`, `tiers.edit`, `view.sibling_departments`,
  `view.finance`, `view.analytics`, `view.ai`, `structure.manage`, `deputy.assign`.
- O'z zonasidagi filiallarni ko'radi.

**Frontendda:**
- CRM → **«Tuzilma»** (`/op/admin/structure`):
  - bo'limlar: ochish, ichki bo'lim, tahrir, «Faol» o'chirish;
  - adminlar: «Tayinlash», muddatli o'rinbosar, olib tashlash;
  - o'rinlar: «Yangi o'rin» rol bilan birga, xodim o'tqazish, bo'shatish, kod va bo'lim;
  - o'rin kartasi: «Rol berish», «Dopusklarni o'zgartirish», «Rolni yopish».
- CRM → **«Foiz»** (`/op/admin/commission`): shablonlar va haftalik to'lovlar.
- Tugmalar `GET /me/permissions/` bo'yicha chiqadi.

**❔ Savollar:**
- **A1. Zona va filial.** Bosh admin bir nechta filialni boshqaradimi? «Filial bosh admini» alohida rolmi?
  Masalan, filialga `department_admin` beriladimi `scope_kind: "filial"` bilan, yoki `zone_admin` beriladimi `scope_kind: "zone"` bilan, zona = bitta filial bo'lsa?
- **A2. Bosh admin yaratish.** Bosh admin boshqa bosh admin yarata oladimi (`zone_admin` rolini bera oladimi)?
  Yoki faqat backend buyrug'i bilanmi? `all` qamrovni kim beradi?
- **A3. Admin va operator yaratish.** Bosh admin bo'lim adminini qanday yaratadi?
  Bizda shunday: «Yangi o'rin» → Rol: «Bo'lim admini» → `POST seats/` + `POST departments/{id}/admins/`. Bu to'g'ri yo'lmi?
  Yoki `POST seats/` ga `role: "department_admin"` qo'shiladimi (logistdagi kabi bitta so'rov)?
- **A4. Dopusk katalogi.** `GET structure/permissions/` javobining aniq shakli qanday? Kalit, nom (uz/ru), guruh, tavsif — misol JSON kerak.
  Frontend hozir har xil shaklni qabul qiladi, nomlarni o'zi yozadi.
- **A5. Dopuskni o'zgartirish.** Mavjud rolning qo'shimcha dopusklarini qanday o'zgartiramiz? Hujjatda `PATCH roles/{id}/` yo'q.
  Hozir frontend yangi rol beradi va eskisini yopadi. `PATCH roles/{id}/ {permissions}` qo'shilsinmi?
- **A6. Bo'lim adminining qo'shimcha dopusklari.** `departments/{id}/admins/` ga yuborilgan `permissions` saqlanadimi?
  Ular `structure/` → `admins[].permissions` da qaytadimi?
- **A7. Bo'lim arxitekturasi.** «Pervichka» va «Baza» dan boshqa tur bo'ladimi? `parent_id` (ichki bo'lim) amalda ishlatiladimi?
  Lidlar ichki bo'limga qanday tushadi?
- **A8. O'rinni ko'chirish.** O'rin boshqa bo'limga ko'chirilsa (`PATCH seats/{id}/ {department_id}`), lidlari ham ko'chadimi?
  Ochiq zakazlar va komissiya nima bo'ladi?
- **A9. Ishdan ketgan xodim.** O'rin bo'shatilgandan keyin `seller` roli qoladimi?
  Yangi odam o'tqazilganda eski rollar va dopusklar yangi odamga o'tadimi (o'rin bilan)?

## B. CRM bo'lim admini / filial admini (`department_admin`)

**Qo'llanmada:**
- Sukut dopusklar: `seat.create`, `seat.block`, `seat.password`, `lead.distribute`, `lead.take`, `view.call_records`, `export.*`, `chat.join_any`.
- Mavjud 4 admin `department_admin` filial qamrovida, yangilari bo'lim qamrovida.

**Frontendda:**
- «Tuzilma» da o'z bo'limi: o'rin ochish, o'tqazish, bo'shatish.
- Lidlarni taqsimlash: Lidlar va Baza doskalari, «Biriktirish».
- «Foiz» faqat `view.finance` berilsa ochiladi.

**❔ Savollar:**
- **B1. `export.*` kalitlari.** Aniq ro'yxati kerak, masalan `export.leads`, `export.orders`. Bu kalitlar UI'da qaysi tugmani ochadi?
- **B2. Eski adminlar.** Eski `is_admin` adminlar (filial qamrovi) «Tuzilma» da hamma bo'limni ko'radimi yoki faqat o'zinikini?
  `structure/` ularga nima qaytaradi?
- **B3. Parol.** `seat.password` bilan admin o'rin parolini ko'radimi yoki faqat o'zgartiradimi? Qaysi endpoint?
- **B4. `lead.take`.** Bu dopusk nimani bildiradi va UI'da qayerda ishlatiladi?

## C. CRM operatori (`seller`)

**❔ Savollar:**
- **C1. Individual foiz.** Individual foiz olib tashlanadi (egasi qarori). `commission_percent` maydoni yaratishda majburiymi?
  Bu haqda audit hujjati, 6-band.
- **C2. Pervichka va Baza farqi.** Pervichka operatori Bazadagi lidni ko'radimi? Baza operatori Pervichkadagini ko'radimi?
  `view.sibling_departments` bo'lmasa — umuman ko'rmaydimi?

---

## D. Bosh logist (`chief_logist`, qamrov `all`)

**Qo'llanmada (§E.0, §C, §K.6.2):**
- Sukut dopusklar: logist dopusklari + `cash.accept`, `cash.collect_from_chiefs`, `couriers.manage`, `zones.manage`, `logist.create`,
  `logist.grant`, `warehouse.view_courier_stores`, `view.other_filials`, `view.finance/analytics/ai`.

**Frontendda (logist sayti):**
- **«Logistlar»** (`/logists`, `logist.create` yoki `logist.grant` bo'lsa ko'rinadi):
  - «Yangi logist» — rol tanlanadi: Logist yoki **Viloyat bosh kuryeri** + viloyat;
  - «Dopusklar», «Bosh logist qilish», «Rolni yopish», «Bloklash».
- **«Kuryerlar» → «Bosh kuryerlar»** (sukut tab): har viloyat bo'yicha bosh kuryer, «Tayinlash» va «Bosh kuryerlikdan olish».
  Bosh kuryerlardan pul qabul qilish ham shu yerda.
- «Kuryerlar» → «Taqsimlash»: tasdiqlangan zakazlarni viloyatlar bo'yicha bosh kuryerlarga berish.
- «Moliya», «Analitika», «AI tahlil», «Sklad».

**❔ Savollar:**
- **D1. Bloklash.** `seat.block` bosh logist sukutida yo'q, shuning uchun u logistni bloklay olmaydi. Berilsinmi?
  Logist parolini kim tiklaydi va qaysi endpoint bilan?
- **D2. Qamrov.** Bosh logist bitta (`all`)mi yoki har filialda bittadan bo'ladimi?
  Filial logisti boshqa filial zakazini `view.other_filials` bilan faqat ko'radimi yoki o'zgartira ham oladimi?
- **D3. Logist bo'limi.** Logist o'rni qaysi bo'limda turadi? `POST seats/ {role: "logist", filial_id}` uni `unassigned_seats` ga qo'yadimi?
  Logistlarni ko'rsatish uchun `structure/` dan qaysi maydonga qarash kerak (`is_logist` yoki `roles`)?
- **D4. Dopusk berish chegarasi.** Bosh logist logistga qaysi dopusklarni bera oladi? Faqat o'zida borlarnimi?
  Masalan, `view.finance` ni oddiy logistga bera oladimi?
- **D5. Logistni o'chirish.** Logistni olib tashlash = `logist` rolini yopish yoki o'rinni bo'shatish/bloklashmi?
  Rol yopilsa akkaunt logist saytiga kira oladimi?
- **D6. `couriers.manage` va `zones.manage`.** Bular endi bosh logistda va bosh kuryerda.
  Oddiy logist kuryer yoki zonani o'zgartira olmaydimi? Logist saytidagi «Kuryerlar → Barcha kuryerlar» va «Zonalar» tahriri endi kimga ochiq bo'lishi kerak?

## E. Logist (`logist`, qamrov `filial`)

**Qo'llanmada:** `orders.manage`, `orders.dispatch`, `addresses.adjust`, `chat.join_any`.

**Frontendda:**
- Buyurtmalar: «Jarayonda» ustuni, bosh kuryerga berish (bittalab va ommaviy), yakunlash, manzil soni.
- Dostavka va Baza: faqat ko'rish, «Yetkazildi» ustuni.
- Xodimlar chati.

**❔ Savollar:**
- **E1. Pul qabul qilish.** Logist bosh kuryerdan pul qabul qiladimi (`cash.collect_from_chiefs` berilsa)? Yoki bu faqat bosh logistning ishimi?
- **E2. Bosh kuryeri yo'q viloyat.** Viloyatda bosh kuryer bo'lmasa, logist zakazni to'g'ridan kuryerga beradimi (`courier_id`, eski yo'l)?
  Egasi «logist faqat bosh kuryerga beradi» degan — eski yo'l yopilsinmi?

## F. Viloyat bosh kuryeri (`chief_courier`, qamrov `region`)

**Qo'llanmada (§C):**
- O'rin + rol. Avtomatik `is_logist` beriladi, logist saytida «Bosh kuryer» bo'limi ochiladi (`chief/me`).
- Sukut dopusklar: `orders.dispatch`, `couriers.manage`, `zones.manage`, `cash.accept`, `warehouse.view_courier_stores`, `view.analytics`.

**Frontendda:**
- Tayinlash: «Kuryerlar → Bosh kuryerlar → Tayinlash» (mavjud akkaunt) yoki «Logistlar → Yangi logist → Viloyat bosh kuryeri».
  Ikkinchisi `role: "logist"` bilan akkaunt ochadi va keyin `chief_courier` beradi.
- Bosh kuryer bo'limi (`/chief`): kelgan zakazlar, avto/qo'lda taqsimlash, kuryerlar, zonalar, kassa, statistika.

**❔ Savollar:**
- **F1. Alohida akkaunt.** Bosh kuryer uchun alohida akkaunt yo'li bo'lsin: `POST seats/ {role: "chief_courier", region, ...}`.
  Hozir `logist` roli bilan ochiladi, shuning uchun ortiqcha logist dopusklari ham keladi. Yoki ochilgach logist rolini yopish kerakmi?
- **F2. Bir nechta bosh kuryer.** Bir viloyatda bir nechta bosh kuryer bo'lsa, zakaz kimga tushadi (`is_default`)?
  Sukutni qanday almashtiramiz — rolni yopib qayta berishmi yoki alohida endpointmi?
- **F3. Bosh kuryer — kuryer.** Bosh kuryer o'zi ham kuryer bo'lib zakaz yetkazadimi (kuryer ilovasida)? Bitta odamga ikki akkaunt kerakmi?
- **F4. Bosh kuryerni olib tashlash.** Rol yopilsa, unga berilgan ochiq zakazlar va kuryerlar jamoasi nima bo'ladi?

---

## G. Umumiy

- **G1. Ruxsatsiz qo'shilish.** Xodim zakaz chatiga ruxsatsiz o'zi qo'shila oladi (egasi). Audit hujjati, 1-band.
- **G2. Hujjatlar.** Har rol qaysi hujjatlarni ko'radi va kim nimani imzolaydi (sklad hujjatlari, kassa, to'lov)?
  Masalan, kirim va chiqimni kim qiladi, bosh kuryer topshiriqni kim tasdiqlaydi. Rol × hujjat jadvali kerak.
- **G3. Rol tarixi.** O'rin darajasida tarix kerak: kim, qachon, qaysi rolni berdi yoki yopdi.
  `structure/?include_ended=1` hozir faqat `me.roles` ga ta'sir qiladi.
- **G4. WebSocket.** Rol yoki dopusk o'zgarsa, foydalanuvchining ochiq sahifasi o'zi yangilanadimi?
  Masalan `permissions_changed` WS bo'lsa, frontend `me/permissions` ni qayta so'raydi.

---

## H. Akkauntlarni boshqarish va dopusk berish — testda hali ishlamaydi 🔴

**Holat.** Testda bosh logist va bosh admin akkaunti yo'q (yoki bizga berilmagan). Shuning uchun:
- logist saytida «Logistlar» bo'limi bo'sh — tugmalar chiqmaydi;
- CRM «Tuzilma» da «Rol berish» yo'q, «Foiz» yopiq.

Frontendda hammasi tayyor. «Logistlar» sahifasi endi kirgan odamning rollari va dopusklarini ko'rsatadi, nima yetishmasligini ham aytadi.

Quyidagi jadvaldagi har qatorni **backend tasdiqlasin**: shu rol shu ishni shu endpoint bilan qila oladimi. Yo'q bo'lsa — nima o'rniga ishlatiladi.

| # | Kim | Nima qiladi | Frontend yuboradi | ❔ |
|---|---|---|---|---|
| H1 | Bosh logist | Yangi logist ochadi | `POST structure/seats/ {role:"logist", filial_id, full_name, username, password, permissions[]}` | Javobda `id` va `password` keladimi? |
| H2 | Bosh logist | Viloyat bosh kuryeri akkauntini ochadi | H1 + `POST structure/roles/ {seat_id, role:"chief_courier", scope_kind:"region", scope_id}` | Bitta so'rov bo'lsinmi (`role:"chief_courier"`) — F1 |
| H3 | Bosh logist | Mavjud akkauntni bosh kuryer qiladi / olib tashlaydi | `POST structure/roles/` / `DELETE structure/roles/{id}/` | Rol `id` qayerdan olinadi — `structure/` → `seats[].roles[]` dan? |
| H4 | Bosh logist | Logistga qo'shimcha dopusk beradi yoki olib qo'yadi | Yangi rol + eskisini yopish (PATCH yo'q) | `PATCH roles/{id}/ {permissions}` qo'shilsin — A5 |
| H5 | Bosh logist | Logistni bosh logist qiladi | `POST structure/roles/ {role:"chief_logist", scope_kind:"all"}` | Faqat `all` qamrovli bera oladimi? |
| H6 | Bosh logist | Logistni bloklaydi va parolini tiklaydi | `POST structure/seats/{id}/vacate/ {block:true}` | `seat.block` sukutda yo'q — D1. Parol tiklash endpointi qaysi? |
| H7 | Bosh admin | Bo'lim ochadi va tahrirlaydi | `POST/PATCH structure/departments/` | — |
| H8 | Bosh admin | Bo'lim admini yaratadi (yangi o'rin + admin) | `POST structure/seats/` + `POST departments/{id}/admins/ {seat_id, permissions[]}` | Bitta so'rov bo'lsinmi — A3 |
| H9 | Bosh admin | Muddatli o'rinbosar tayinlaydi | `POST departments/{id}/admins/ {seat_id, until}` | — |
| H10 | Bosh admin | Boshqa bosh admin tayinlaydi | `POST structure/roles/ {role:"zone_admin", scope_kind:"zone", scope_id}` | Bunga ruxsat bormi — A2 |
| H11 | Bosh admin | Adminga qo'shimcha dopusk beradi (masalan `view.finance`) | `POST structure/roles/` (+ H4) | — |
| H12 | Bosh admin | Operator ochadi, o'tqazadi, bo'shatadi | `POST seats/`, `seats/{id}/occupant/`, `seats/{id}/vacate/` | — |
| H13 | Bosh admin | Pervichka va Baza foizi | `POST commission-tiers/` | `department_kind` qamrovi — audit, 6-band |
| H14 | Hamma | O'z rollari va dopusklarini ko'radi | `GET /me/permissions/` | Javobda `roles[]` ning `scope_kind` va `scope_id` si bormi? |

**Testda kerak:**
1. Bitta bosh logist akkaunti — `chief_logist`, `all`.
2. Bitta bosh admin — `zone_admin` (Mehrigiyo Toshkent zonasi).
3. Har biriga login va parol, **alohida yo'l bilan**.

Shundan keyin H1–H14 ni testda o'zimiz tekshirib, natijani yozib qaytaramiz.

---

## I. Logistika zanjiri: bosh kuryer, manzil soni, kuryer haqi va statistika — tasdiqlang yoki moslang 🔴

**Egasi qanday ishlashini aytdi.** Backendda boshqacha ishlayotgan bo'lsa — shunday qilinsin. Har qadamda «backendda hozir qanday» ni yozinglar.

### I.1 Bosh logist → viloyat bosh kuryeri
- Bosh logist har viloyatga bosh kuryer akkauntini **ochadi** va tayinlaydi. Bu logist saytida: «Logistlar → Yangi logist → Viloyat bosh kuryeri»,
  «Kuryerlar → Bosh kuryerlar → Tayinlash».
- **❔ I.1a.** Bosh kuryer akkaunti uchun alohida yo'l (F1). Ochilgan akkaunt qaysi filialga yoziladi?
  Bitta bosh kuryer bir nechta viloyatga tayinlansa bo'ladimi?

### I.2 Bosh kuryer o'z platformasida (`mehrigiyo_admin_next`) ishlaydi
Bosh kuryer o'z saytida:
- o'z **kuryerlarini yaratadi**: `POST /chief/couriers/`, akkaunt bilan;
- o'z viloyatida **zonalar** yaratadi va tahrirlaydi: `/chief/zones/`;
- **kuryerni zonaga** biriktiradi: `zone_ids`;
- logistdan kelgan zakazni **kuryerga biriktiradi**: `/chief/orders/{id}/assign/`, `auto-assign`.

**❔ Savollar:**
- **I.2a.** Shu to'rttasi `/api/operator/chief/*` da to'liq ishlayaptimi? Bosh kuryer saytida yetishmaydigan endpoint bormi?
- **I.2b.** Bosh kuryer yaratgan kuryer logist saytidagi kuryerlar ro'yxatida va xaritada ko'rinadimi?
  Kuryerning `chief` maydoni bormi?
- **I.2c.** Bosh kuryer kuryer akkauntini bloklashi, parol berishi va qurilmasini almashtirishi mumkinmi? Qaysi endpointlar?
- **I.2d.** Zona boshqa bosh kuryer viloyatiga tegsa — `403 zone_other_region`. Viloyat chegarasidagi tumanlar qanday hal qilinadi?

### I.3 Manzil soni — logist belgilaydi
- Har bir yetkazilgan yoki atkaz zakazda **manzil soni** bor. Sukut: yetkazildi — 1, atkaz — 0, birlashtirilgan manzil — bir marta.
- Logist yakunlashda sonni o'zgartiradi (`courier_addresses` 0…9). Yopilgandan keyin ham o'zgartiradi: `POST orders/{id}/addresses/`, qo'llanma §2.3b.
- Kun bo'yicha ±1 tuzatish: `address-adjustments`, §B.
- **❔ I.3a.** Sukut qiymatlar qayerda belgilanadi? Yetkazildi = 1, atkaz = 0 — bular sozlanadimi? Agar sozlansa, kim sozlaydi?
- **❔ I.3b.** Manzil sonini bosh kuryer ham o'zgartira oladimi yoki faqat logistmi?

### I.4 Bir manzil narxi — bosh logist belgilaydi
- **Egasi:** bosh logist **bir manzil uchun sukut summani** belgilaydi. Kuryer haqi = manzil soni × summa.
- Qo'llanmada `pay_rate` / `courier_pay_rate` faqat **o'qiladi**: statistikada, `/chief/stats/`, `/courier/stats/`.
  Qayerda belgilanishi yozilmagan (misollarda 70 000 va 15 000).
- **❔ Savollar:**
  - **I.4a.** Stavka qayerda saqlanadi va qaysi endpoint bilan o'zgartiriladi?
    Taklif: `GET/PUT /operator/logist/pay-rates/` — `{default, by_region: {fargona: 15000}, by_courier?: {...}}`, kuchga kirish sanasi bilan (tarix).
  - **I.4b.** Stavka viloyat bo'yicha farq qiladimi? Kuryer bo'yicha-chi?
  - **I.4c.** Kim o'zgartiradi? Taklif: faqat bosh logist, yangi `pay_rate.edit` dopuski. Bosh kuryer o'z kuryerlariga boshqa stavka qo'ya oladimi?
  - **I.4d.** Stavka o'zgarsa, eski kunlar qayta hisoblanadimi yoki «yetkazish kunida amal qilgan stavka» qoladimi?
    Kodda shunday izoh bor.

### I.5 Statistika va moliya — uch daraja
Egasi qanday ko'rishni xohlaydi:

| Kim | Ko'radi |
|---|---|
| Kuryer (ilova) | O'z manzillari, yetkazgani, atkazi, haqi — kun, hafta, oy |
| Bosh kuryer | Har kuryeri bo'yicha shu raqamlar + viloyat jami, kassa |
| Bosh logist (logist sayti: Moliya, Analitika, Statistika) | Har viloyat bo'yicha jami, viloyat ichida har kuryer, har bosh kuryer; logist va kuryerlarga qancha pul berilishi |

- **❔ Savollar:**
  - **I.5a.** Viloyat → bosh kuryer → kuryer bo'yicha yig'ilgan statistika bitta endpointdan keladimi?
    Masalan `GET logist/statistics/?group=region` → `regions[].chiefs[].couriers[]`. Hozir `logist/statistics/` da faqat `couriers[]`.
  - **I.5b.** «Logistlarga qancha pul berilishi» — logist o'zi haq oladimi (manzil soniga qarab), yoki bu kuryer haqimi?
    Logist haqi bo'lsa, formulasi qanday?
  - **I.5c.** Moliya bo'limida (`logist/finance` yoki sklad moliyasi) kuryer haqi «to'landi» deb yopiladimi? Haftalik yoki oylik? Kim yopadi?
  - **I.5d.** Ombor (sklad) bilan bog'liqligi: kuryer yetkazgan mol bosh kuryer omboridan kamayadimi? Bosh kuryer kuryerga mol beradimi?
