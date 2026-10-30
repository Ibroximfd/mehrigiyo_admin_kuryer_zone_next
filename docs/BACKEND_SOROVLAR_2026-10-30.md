# Backend'dan so'rovlar — frontend tayyorlagan ishlar uchun (2026-10-30)

Manba: `FRONTEND_TOLIQ_QOLLANMA_2026_10_30.md` (A–J). Frontend A, C, D, I, J bo'limlarini uladi.
Quyida ular to'g'ri va tez ishlashi uchun backend qilishi kerak bo'lgan ishlar, keyin keyingi bosqichlar bo'yicha savollar.
**Muhimlik:** 🔴 kerak (hozir noaniq ishlaydi) · 🟡 tezlik va qulaylik · ❔ javob kerak.

---

## 1. Logist doskasi — «Jarayonda» ustuni 🔴

Hozir frontend «Jarayonda» ni har ustunning birinchi 20 zakazidan yig'adi:
`shipping` + `courier_outcome≠none`, va `pending`/`confirmed` + `refused`.
Ustunda 20 tadan ko'p zakaz bo'lsa, jarayondagilarning bir qismi ko'rinmay qoladi.

**So'rov.** `GET /operator/logist/orders/board/` javobida alohida `review` ustuni bo'lsin:

```json
{ "columns": [
  { "status": "confirmed", "count": 4,  "total_payable_amount": "..." , "orders": [...] },
  { "status": "shipping",  "count": 12, "...": "faqat courier_outcome=none" },
  { "status": "review",    "count": 3,  "...": "shipping+outcome, pending/confirmed+refused (operator)" },
  { "status": "delivered", "...": "..." },
  { "status": "cancelled", "...": "..." }
] }
```

- `shipping` ustunidan jarayondagilar chiqarilsin, sonlar va summalar ham shunga mos bo'lsin.
- `review` ichida eng eski so'rov birinchi kelsin (`outcome_requested_at`).
- Ro'yxat uchun ham filtr kerak: `GET /operator/logist/orders/?in_review=1`.
- WS `order_updated` / `order_status_changed` payloadida `courier_outcome`, `outcome_source`, `outcome_requested_at` va `chief_courier` bo'lsin.
  Shunda karta qayta yuklashsiz «Jarayonda» ga o'tadi.

## 2. Logist zakazni faqat bosh kuryerga beradi (egasi qarori) 🔴

Logist kuryer tanlamaydi: tasdiqlangan zakaz **viloyat bosh kuryeriga** beriladi, kuryerni bosh kuryer tanlaydi.
Frontendda kuryer tanlovi olib tashlandi. Yo'lga chiqarish faqat `{status: "shipping", chief_courier_id}` bilan.

- **Ommaviy berish.** `POST /operator/logist/orders/bulk/` ga `action: "assign_chief"` kerak:
  ```json
  { "order_ids": [...], "action": "assign_chief", "chief_courier_id": 17 }
  ```
  - Natija `applied[]` / `failed[{id, code}]`, `assign_courier` dagi kabi.
  - Hozir frontend har zakazga alohida PATCH yuboradi (100 zakaz = 100 so'rov).
- **Bosh kuryer filtri.** `?chief=<id>` va `?chief=none` (bosh kuryerga berilmagan). Kerak bo'ladigan joylar:
  - `orders/`;
  - `orders/board/`;
  - tezkor chip «Bosh kuryersiz».
- **Taqsimlash soni.** `GET orders/unassigned-counts/` endi «bosh kuryerga berilmagan tasdiqlanganlar» ni `by_region` bo'yicha bersin.
  «Taqsimlash» oynasi sonlarni shundan oladi; hozir 100 tagacha zakaz yuklab o'zi sanaydi.
- **Viloyatning sukut bosh kuryeri** ❔. Hozir frontend `logist/chiefs/` dan `regions` mos kelgan birinchisini oladi.
  Bitta viloyatda ikki bosh kuryer bo'lishi mumkinmi? Bo'lsa, qaysi biri sukut bo'ladi (`is_default`)?
- **Eski yo'llar** ❔. `PATCH {courier_id}` (logist kuryer tanlashi) va `orders/{id}/courier-candidates/` logist uchun yopiladimi?
  Frontend ularni endi chaqirmaydi.

## 3. Zakaz chati a'zoligi 🔴

- **Logistlarni topish.** Oddiy operator (CRM sotuvchisi) chatga logistni qo'shishi kerak.
  - `GET /api/operator/admin/operators/` unga `403` beradi.
  - Frontend `GET /staff-chat/channels/team/members/` dan oladi. Bu endpoint operatorga ham ochiq bo'lsin va `seat_id` ni bersin.
  - Yaxshisi bitta endpoint: `GET /staff-chat/channels/{id}/candidates/?q=`. U faqat shu odam **qo'sha oladigan** xodimlarni bersin (`seat_id, full_name, role_label`).
- **WS.** `member_added` / `member_removed` hodisasi kanal guruhiga yuborilsin. Ochiq paneldagi ishtirokchilar ro'yxati shu bilan yangilanadi.
- **Bayroq.** `ORDER_CHAT_MEMBERSHIP` ni frontend prodga chiqqandan keyin yoqing.
  - Logist sayti — `9ad3bde`.
  - CRM — `7073c4c`.

## 4. Operator atkazi → jarayon 🟡

`OPERATOR_CANCEL_NEEDS_LOGIST_REVIEW` uchun frontend tayyor:
- CRM da «Jarayonda · atkaz, logist tasdiqlaydi» belgisi;
- logistda «Operator: atkaz» va «Atkazni tasdiqlash».

Faqat 1-banddagi `review` ustuni bo'lishi kerak. Aks holda `pending` dagi atkaz so'rovi 20 talik chegaradan tashqarida qolishi mumkin.

## 5. Tezlik 🟡

- **Ustunlarni tanlab olish.** Logist doskada ustunlarni yashiradi (masalan faqat «Yo'lda» va «Jarayonda»).
  `orders/board/?columns=shipping,review` qo'llab-quvvatlansa, yashirin ustunlar so'ralmaydi.
- **Bo'lim WS guruhi.** Lid hodisalari ikki guruhdan keladi (B6). Frontend dublikatni tashlaydi, lekin uni olib tashlash sanasini ayting.

---

## 6. Keyingi bosqichlar uchun savollar ❔

### 4-bosqich — Tuzilma va rollar (CRM)
1. **Kim nimani ko'radi.** Frontend tugmalarni ko'rsatish uchun joriy foydalanuvchining **samarali ruxsatlari**ni qayerdan oladi?
   - `GET structure/` → `me.roles[].effective_permissions` yetarlimi?
   - Yoki alohida `GET /operator/me/permissions/` bo'ladimi? Bu tez va har sahifada kerak.
2. **Logist saytida «Logistlar» bo'limi.** Bosh logist logist yaratadi va bosh kuryer tayinlaydi. Shu endpointlar (`structure/seats/` role=logist, `structure/roles/`) logist tokeni bilan ishlaydimi?
3. **O'chirish.** Bo'limni o'chirish yo'q (faqat `is_active`). O'rin bo'shatilganda lidlar o'rinda qoladi. Bo'shatilgan o'rinni qayta ishga tushirish `occupant` bilan bo'ladimi?
4. **O'rin kodi (`seat_code`).** Formati qanday (masalan `B1-03`)? Avto beriladimi yoki qo'lda?
5. **Xodim telefoni.** Unikalmi? Bitta odam ikki o'rinda o'tira oladimi?
6. **Rollar tarixi.** `DELETE roles/{id}` faqat `until` qo'yadi. Tarixni ko'rsatish uchun `?include_ended=1` kerak bo'ladi.

### 5-bosqich — Pog'onali foiz (CRM)
1. Summalar satr (`"7200000.00"`) bo'lib keladi. Hamma joyda shundaymi yoki son ham bo'lishi mumkinmi?
2. «Haftani yopish» qayta bosilsa (`paid` emas) — qayta hisoblaydimi? Frontend tasdiqlash oynasini shunga qarab yozadi.
3. Operator ilovasi yoki CRM sotuvchisi uchun «hozirgi pog'onam» WS bilan yangilanadimi (yetkazilganda) yoki so'rov bilanmi?

### 6-bosqich — Egasiz lid (CRM)
1. Dostavka va Baza doskasida egasiz kartalar filtri: `?assigned=none`.
2. Admin «biriktirish» — mavjud lid biriktirish endpointimi (`leads/{id}/assign/`)?
3. `lead_handover` WS — CRM qaysi ekranlarni yangilashi kerak? Sotuvchiga «lid Bazaga o'tdi» xabari kerakmi?
