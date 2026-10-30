# Backend'dan so'rovlar — qo'llanma va test server auditi (2026-10-30)

**Audit natijasi.** `FRONTEND_TOLIQ_QOLLANMA_2026_10_30.md` dagi hamma endpointni test serverda (`imorganic.uz`)
tokensiz so'rov bilan tekshirdik. Hammasi mavjud: avtorizatsiyasiz 401 qaytaradi, mavjud bo'lmagan yo'l esa 404.
Frontend (logist sayti va CRM) ularning hammasini ishlatadi.

Quyidagilar backend'da kerak.

## 1. Qidiruvdan zakaz chatiga qo'shilish — ruxsatsiz 🔴

**Egasi qarori:** xodim zakaz raqami bo'yicha qidirib topgan chatga **o'zi qo'shila oladi**. Hech kim ruxsat berishi shart emas.

**Hozirgi holat:**
- `GET /staff-chat/orders/search/` natijasida chat hali ochilmagan zakaz `channel_id: null` bilan keladi.
- Bunday zakazni ochishga urinsa, `GET channels/order/{id}/` ishtirokchi bo'lmagan odamga `channel_forbidden` qaytaradi.

**So'rov:**
- `POST /api/staff-chat/orders/{order_id}/join/` qo'shilsin. U kanalni kerak bo'lsa yaratadi, so'rovchini a'zo qiladi va kanal obyektini qaytaradi.
  Test serverda bu yo'l hozir **404**. Frontend uni chaqiradi, 404 olsa vaqtincha `channels/order/{id}/` ga o'tadi.
- `can_join` hamma faol xodim uchun `true` bo'lsin (kuryerlardan tashqari). `POST channels/{id}/join/` ham rad etmasin.
- Agar kim qo'shilishini cheklash kerak bo'lsa, qoidani aytinglar — frontend shunga moslaydi.

## 2. «Yetkazildi» ustuni — 24 soat 🔴

Alohida hujjatda: `docs/BACKEND_SOROV_YETKAZILDI_USTUNI_2026-10-30.md`.

## 3. Bosh kuryer akkaunti ❔

- **Qanday tayinlanadi.** Bosh kuryer = o'rin + `chief_courier` roli. Logist saytida «Kuryerlar → Bosh kuryerlar → Tayinlash» mavjud o'ringa
  `POST structure/roles/ {role: "chief_courier", scope_kind: "region", scope_id}` yuboradi. O'rinlar ro'yxati `structure/` dagi logist o'rinlaridan olinadi.
- **Savol: yangi akkaunt.** Bosh kuryer uchun yangi akkaunt qanday ochiladi?
  - `POST structure/seats/ {role: "chief_courier", filial_id, full_name, username, password, region}` bo'lsa yaxshi bo'lardi.
  - Hozir faqat `role: "logist"` bilan ochiladi, bu esa ortiqcha logist roli va dopusklarini ham beradi.
- **Savol: ro'yxatda ko'rinish.** Bosh kuryer roli berilgan o'rin `structure/` da logist o'rinlari qatorida (`is_logist: true`) keladimi?
  «Bosh kuryerlikdan olish» tugmasi rol qatorini shu yerdan topadi.

## 4. Dopusk sukutlari ❔

- **`seat.block`.** `chief_logist` sukutida `seat.block` yo'q, shuning uchun bosh logist «Logistlar» bo'limida logistni bloklay olmaydi.
  Bosh logistga sukutda berilsinmi yoki bloklashni bo'lim admini qiladimi?
- **«To'landi».** Haftalik to'lovni «To'landi» qilish uchun `view.finance` yetadi — frontend shunday qildi (qo'llanma B5 §2).

## 5. Boshqa topilmalar 🟡

- **`GET /sklad/filials/` → 404** testda. Sklad dopusk oynasi filiallar ro'yxatini shundan oladi. Sklad branchi testga chiqmagan bo'lishi mumkin.
- **`POST structure/employees/`** frontend tomonidan chaqirilmaydi: yangi odam o'ringa o'tqazishda `occupant {full_name, phone}` bilan yaratiladi. Shu yo'l yetadimi?
- **Birinchi bosh admin va bosh logist** faqat `grant_staff_role ... --apply` bilan beriladi.
  Testda bu bajarilganmi? Shu bo'lmasa CRM «Tuzilma», «Foiz» va logist «Logistlar» bo'limlarida boshqaruv tugmalari chiqmaydi.

## 6. Individual foiz olib tashlanadi — hamma uchun bitta shablon 🔴

**Egasi qarori (2026-10-30):**
- Operatorda **individual foiz bo'lmaydi**.
- Foizni faqat CRM bosh admini **«Foiz»** bo'limida belgilaydi. U hamma operator uchun bir xil, **Pervichka** va **Baza** uchun alohida.

**Frontend nima qildi:**
- «Komissiya (%)» maydoni olib tashlandi: «Yangi o'rin» (Tuzilma), «Yangi operator» va operatorni tahrirlash oynasida.
- Operatorlar ro'yxatidagi foiz ustuni ham olib tashlandi.
- Vaqtincha: `POST admin/operators/create/` avvalgidek `commission_percent: 10` yuboradi. Agar maydon majburiy bo'lmasa, aytinglar — yubormaymiz.

**Backend'dan kerak:**
1. **`commission_percent`.** Operator va o'rin yaratishda bu maydon kerak bo'lmasin va hisobda ishlatilmasin (shablon bo'lmasa ham).
   Shablon yo'q filialda nima bo'ladi: 0% mi yoki sukut shablon?
2. **Bo'lim turi bo'yicha shablon.** `POST commission-tiers/` ga `department_kind: "primary" | "base"` qamrovi qo'shilsin.
   Bitta shablon shu turdagi **hamma** bo'limga (hamma filialda) tegishli bo'lsin. Hozir qamrov faqat bitta bo'lim yoki filial —
   bosh admin har bo'limga alohida kiritishi kerak bo'ladi.
3. **Kim belgilaydi.** Shablonni faqat bosh admin (`tiers.edit`) kiritadi — bo'lim admini emas. Bu shundaymi?
   Test serverdagi `Test_admin` akkauntida `tiers.edit` ham, `view.finance` ham yo'q, shuning uchun «Foiz» sahifasi bo'sh.
   Testda bosh admin (`grant_staff_role --role zone_admin --zone <id> --apply`) berilsin.
