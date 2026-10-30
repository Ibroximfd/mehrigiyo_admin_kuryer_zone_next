# Logist oqimi va Manzillar — backend talablari (2026-10-29)

Logist sayti (`mehrigiyo_operator_next`) frontendi tayyor. Backend shu hujjat bo'yicha o'zgarishi kerak.
Oldingi hujjat `MANZIL_SONI_BACKEND_TALABLAR.md` (qo'lda ±1 tuzatish) kuchda qoladi. Bu hujjat unga qo'shimcha.

## Qisqacha

1. **Kutilmoqda (`pending`) logistga ko'rsatilmaydi.** Logist faqat tasdiqlangan zakazdan boshlab ishlaydi.
2. **Har bir zakaz yakunlanishdan oldin jarayondan o'tadi.** Jarayon `shipping` («Yo'lda»).
   `Yetkazildi` ham, `Atkaz` ham faqat `shipping` dan bo'ladi va faqat logist tasdig'i bilan.
3. **Yakunlashda kuryerga manzil yoziladi.** Logist sonini o'zi belgilaydi.
   Yetkazildi uchun sukut `+1`. Atkaz uchun sukut `0`.
4. **«To'xtashlar» endi «Manzillar».** Bu faqat UI nomi, endpointlar o'zgarmaydi.
   Asosiy taklif qoidasi: manzil va mijoz telefoni bir xil bo'lsa, logistga ogohlantirish bilan birlashtirish taklif qilinadi.

---

## 1. Kutilmoqda logistdan yashiriladi

Logistning hamma o'qish endpointlarida `pending` zakaz qaytmasin.

| Endpoint | O'zgarish |
|---|---|
| `GET /api/operator/logist/orders/` | `status` berilmasa ham `pending` qaytmaydi |
| `GET /api/operator/logist/orders/board/` | `pending` ustuni yuborilmaydi |
| `GET /api/operator/logist/delivery/…` (Dostavka) | Faqat `pending` zakazi bor lid kartasi Dostavkaga tushmaydi |
| Statistika va dashboard sonlari | `pending` hisoblanmaydi |
| WS (`order_created`, `order_confirmed` …) | Logist kanaliga `pending` zakaz yuborilmaydi. Tasdiqlanganda (`→ confirmed`) zakaz logistga birinchi marta keladi |

Frontend o'zi ham himoyalangan.
U ro'yxat so'rovida `status=confirmed,shipping,delivered,cancelled` yuboradi va kelgan `pending` ustunni tashlab yuboradi.

## 2. Logist o'tish matritsasi (yangi)

`PATCH /api/operator/logist/orders/{id}/` endi faqat quyidagi o'tishlarga ruxsat beradi.
Qolgani `403 {code: "status_transition_forbidden"}` qaytaradi.

| Qayerdan | Qayerga | Turi | Majburiy maydon |
|---|---|---|---|
| `confirmed` | `shipping` | yo'lga chiqarish | `courier_id` |
| `shipping` | `delivered` | yetkazildi | `courier_addresses` (ixtiyoriy, §3) |
| `shipping` | `cancelled` | atkaz | `cancel_reason`, ixtiyoriy `cancel_note`, `courier_addresses` |
| `shipping` | `confirmed` | orqaga | `revert_reason` |
| `delivered` | `shipping` | orqaga (jarayonga) | `revert_reason` |
| `cancelled` | `shipping` | tiklash (jarayonga) | `revert_reason` |
| `cancelled` | `confirmed` | tiklash | `revert_reason` |

Olib tashlangan o'tishlar:
- `pending → *`.
- `* → pending`.
- `confirmed → cancelled`: atkaz endi faqat jarayondan.
- `delivered → confirmed | cancelled`: yetkazilgan zakaz faqat jarayonga qaytadi.

Operator va admin uchun `pending` oqimi (CRM) o'zgarmaydi. Bu matritsa faqat logist roli uchun.

### Kuryer ilovasi

Kuryerning «Yetkazdim» va «Yetkazib bo'lmadi» tugmalari zakazni **yakunlamaydi**.

- **«Yetkazdim»:** `delivery_stage = "delivered"` bo'ladi, `status` esa `shipping` bo'lib qoladi.
- **«Yetkazib bo'lmadi»:** `delivery_stage = "failed_attempt"` bo'ladi va urinish yoziladi. `status` `shipping` bo'lib qoladi.
- **Logist tasdig'i:** `status` `delivered` yoki `cancelled` ga faqat logist PATCH qilganda o'tadi.
  Komissiya, Bazaga o'tish va mijozga push shu paytda ishlaydi.
- **WS:** kuryer «yetkazdim» bosganda `order_stage_changed {order_id, delivery_stage}` yuboriladi.
  Logist doskasida karta «Yo'lda» ustunida qoladi, bosqich belgisi esa «Yetkazildi» bo'ladi.

## 3. Kuryerga manzil — `courier_addresses`

Yakunlovchi PATCH tanasida yangi maydon bor:

```json
{ "status": "delivered", "courier_addresses": 1 }
{ "status": "cancelled", "cancel_reason": "no_answer", "cancel_note": "", "courier_addresses": 2 }
```

Qoidalar:

- **Qiymat:** butun son `0…9`. Boshqa qiymat `400 {code: "courier_addresses_invalid"}` qaytaradi.
- **Maydon berilmasa, sukut ishlaydi:**
  - `delivered` uchun `1`;
  - `cancelled` uchun `0`;
  - Manzilga birlashtirilgan zakaz (`stop_id` bor) uchun `0`, chunki manzilning o'zi §4 bo'yicha `+1` beradi.
- **Saqlash:** qiymat zakazga yoziladi: `order.courier_addresses`, `order.courier_addresses_manual`.
  `manual` logist sukutdan farqli son yuborganini bildiradi. Sana — yakunlash kuni, kuryer — zakazning kuryeri.
  Kuryer biriktirilmagan zakazda maydon e'tiborga olinmaydi.
- **Orqaga qaytarish:** `delivered → shipping` yoki `cancelled → shipping | confirmed` bo'lsa, zakaz bergan manzil kuryerdan olib tashlanadi.
  Qayta yakunlanganda yangi qiymat yoziladi. Undo (5 soniya) ham shu yo'l bilan ishlaydi.
- **Javob:** zakaz obyektida `courier_addresses` va `courier_addresses_manual` qaytsin, tafsilotda ko'rsatish uchun.
- **Tarix (timeline):** `courier_addresses: N` hodisaga yozilsin. Masalan: «Logist Aziz: atkaz · kuryerga +2 manzil».
- **WS:** `courier_addresses_changed {courier_id, date, total}`. Bu hodisa avvalgi hujjatda ham bor.

### Kuryer manzil soni qanday hisoblanadi

```
kun bo'yicha manzil = Σ zakaz.courier_addresses            (yakunlangan, manzilsiz zakazlar)
                    + yopilgan manzillar soni               (§4, har biri +1)
                    + Σ qo'lda tuzatishlar (±1 jurnal)       (MANZIL_SONI hujjati §1)
```

- Statistikadagi `stops`, `stops_manual`, moliyadagi `addresses` va `logistics = stavka × addresses` shu formuladan olinadi.
- `stops_manual` ichiga ±1 jurnal va sukutdan farq qiladigan `courier_addresses` qiymatlari kiradi.
  Ikkinchisi uchun `courier_addresses − sukut` olinadi.

## 4. Manzillar (avvalgi «To'xtashlar»)

Endpointlar o'sha. Faqat UI nomi o'zgardi: «Manzil #N», «Bir manzil» tugmasi.

| Amal | Endpoint |
|---|---|
| Ro'yxat | `GET /api/operator/logist/stops/` |
| Birlashtirish | `POST /api/operator/logist/stops/` |
| Avto | `POST /api/operator/logist/stops/auto/` |
| Chiqarish | `DELETE /api/operator/logist/stops/{id}/orders/{order_id}/` |

### 4.1. Takliflar — `GET /api/operator/logist/stops/suggestions/?date=`

Yangi asosiy qoida: **manzil bir xil va mijoz telefoni bir xil.**

- **Manzil:** `delivery_address_text` normallashtirilgan holda solishtiriladi, yoki koordinatalar 50 m dan yaqin bo'ladi.
- **Telefon:** mijozning asosiy telefoni, `+998XXXXXXXXX` ko'rinishida normallashtiriladi.
- **Zakazlar:** ochiq (`confirmed` yoki `shipping`), hali manzilga kirmagan, kamida 2 ta.
- **Kuryer:** shart emas. Har xil yoki biriktirilmagan bo'lsa ham taklif chiqadi, lekin `couriers_differ: true` bilan.
  Logist avval bitta kuryer biriktiradi, keyin birlashtiradi.
- **Eski qoida** (bir kuryer, bir kun, bir manzil, telefon har xil) ham qoladi. Unda `match: "address"` beriladi.

Javob elementi:

```json
{
  "match": "phone_address",
  "date": "2026-10-29",
  "address_text": "Qo'qon sh., Navoiy ko'ch. 12",
  "client": { "full_name": "Dilnoza R.", "phone": "+998901112233" },
  "courier": { "id": 7, "full_name": "Jasur K." },
  "couriers_differ": false,
  "order_ids": ["a1", "b2"],
  "order_numbers": ["DA-1001", "DA-1002"]
}
```

- **Tartib:** `phone_address` guruhlari birinchi keladi. Frontend ham shunday saralaydi.
- **`stops/auto/`:** faqat `couriers_differ: false` bo'lgan guruhlarni birlashtiradi.
- **Ogohlantirish (ixtiyoriy):** logist nav belgisi uchun `GET …/stops/suggestions/count/` qo'shilsa yaxshi.
  U `{phone_address: N}` qaytaradi. WS hodisasi esa `stop_suggestions_changed {date, phone_address}`.

### 4.2. Manzil va kuryer haqi

- **Bitta to'lov:** manzil (stop) yopilganda kuryerga `+1` manzil yoziladi. Ichidagi zakazlarning `courier_addresses` sukuti `0`.
- **Yopilish:** manzil uning hamma zakazi logist tomonidan yakunlanganda yopiladi.
  Agar ulardan kamida bittasi `delivered` bo'lsa, manzil `delivered` bo'ladi.
  Hammasi `cancelled` bo'lsa, manzil `+0` beradi. Logist uni zakaz oynasida `+N` bilan tuzatadi.
- **Kuryer tomoni:** `/courier/stops/{id}/deliver/` endi faqat `delivery_stage = delivered` qo'yadi.
  Statuslarni logist yopadi (§2).

## 5. Kuryer ilovasi (`mehrigiyo_kuryer_app`, frontend tayyor)

### 5.1. Zakaz obyekti — yangi maydonlar

`GET /courier/today/`, `GET /courier/orders/{id}/` va WS kartalarida bular qaytsin:

| Maydon | Qiymat | Ma'nosi |
|---|---|---|
| `courier_outcome` | `"none"` · `"delivered"` · `"refused"` | Kuryer nima bilan yakunlagani |
| `courier_addresses` | `int` yoki `null` | Logist tasdiqlaganda yozilgan manzil soni |

- **«Yetkazdim» (`deliver/`, `stops/{id}/deliver/`):** `courier_outcome = "delivered"`, `delivery_stage = "delivered"`. `status` `shipping` bo'lib qoladi.
- **Atkaz:** urinish `next_step = "return_to_logist"` bilan yuboriladi.
  Natija: `courier_outcome = "refused"`, `delivery_stage = "failed_attempt"`, `status` esa `shipping` bo'lib qoladi.
- **Boshqa urinishlar** (`retry_today`, `tomorrow`): `courier_outcome` `"none"` qoladi va zakaz kuryerda faol bo'ladi.
- **Logist tasdig'i:** `status` `delivered` yoki `cancelled` bo'ladi, `courier_addresses` to'ladi, kuryerga `order_updated` yuboriladi.
- **Logist jarayondan orqaga qaytarsa** (`shipping → confirmed`): `courier_outcome` `"none"` ga tushadi va zakaz kuryerda yana faol bo'ladi.

Ilovada «Bugun» ekranida yangi «Jarayonda · N» bo'limi bor.
Unda «JARAYONDA · YETKAZILDI» yoki «JARAYONDA · ATKAZ» yozuvi va «Logist tasdiqlaydi» izohi turadi.
Logist tasdiqlagach zakaz «Yopilgan» bo'limiga o'tadi.
Maydon kelmasa ham ilova ishlaydi: `shipping` va `delivery_stage = delivered` jarayonda deb o'qiladi.

### 5.2. Manzil soni — `GET /courier/stats/?period=day|week|month`

Ilova manzilni **o'zi hisoblamaydi**. Faqat server raqamini ko'rsatadi, shuning uchun bu raqam aniq bo'lishi shart.
Hisob §3 formulasi bilan bir xil bo'lsin: logist saytidagi «Kuryer haqi» bilan bir xil son chiqsin.

```json
{
  "delivered": 9,
  "stops": 8,
  "pay_rate": 15000,
  "earnings": 120000,
  "addresses": {
    "total": 8,
    "manual": 1,
    "awaiting": 2,
    "by_day": [
      { "date": "2026-10-29", "total": 5, "manual": 1 },
      { "date": "2026-10-28", "total": 3, "manual": 0 }
    ]
  }
}
```

- **`total`:** davrdagi tasdiqlangan manzillar. Bunga zakaz krediti, yopilgan manzillar va qo'lda ±1 kiradi.
  `stops` ham shu songa teng bo'lsin, chunki eski maydon. `earnings = total × pay_rate` (har kunga o'sha kungi stavka).
- **`manual`:** shundan logist sukutdan farqli qilgani (±).
- **`awaiting`:** kuryer yakunlagan, logist hali tasdiqlamagan zakazlar soni. Ular `total` ga **kirmaydi**.
- **`by_day`:** `week` va `month` uchun har ish kuni alohida, `day` uchun bitta yozuv.
  Kunlarning `total` yig'indisi jami `total` ga teng bo'lishi shart.
- **Kun chegarasi va hafta:** kun Toshkent vaqti (UTC+5) bo'yicha hisoblanadi. `week` dushanbadan bugungacha. `month` oyning 1-kunidan bugungacha.
- **WS:** `courier_addresses_changed` kuryer kanaliga ham yuborilsin.
  Hozir ilova statistikani profil ochilganda va davr almashganda yangilaydi. WS orqali jonli yangilash keyingi qadam.

## 6. Hudud filtri — bir nechta qiymat

Logist saytida viloyat, zona va tuman filtrlari endi ko'p tanlovli.
Qiymatlar vergul bilan yuboriladi. Backend hamma joyda `IN` bo'yicha filtrlasin.

| Endpoint | Parametrlar |
|---|---|
| `GET /operator/logist/orders/`, `…/orders/board/` | `region=fargona,andijon` · `zone=7,8` yoki `zone=none` · `district=k1,k2` |
| `GET /operator/logist/couriers/` | `region=a,b` · `zone=7,8` · `district=k1,k2` |
| `GET /operator/logist/couriers/live/` | xuddi shunday |

- **Zona:** `zone` va `district` avval ham vergulni qabul qilardi. Yangi narsa — `region` endi ham vergulli ro'yxat.
- **Yaroqsiz kod:** noma'lum viloyat kodi e'tiborsiz qoldirilsin. `400` qaytmasin.
- **`zone=none`:** har doim yolg'iz keladi, boshqa zonalar bilan aralashmaydi.

## 7. Xato kodlari (frontendda tayyor matn bor)

| Kod | Qachon |
|---|---|
| `status_transition_forbidden` | Matritsada yo'q o'tish (§2) |
| `cancel_reason_required` | Atkazda sabab yo'q |
| `courier_addresses_invalid` | `0…9` emas |
| `order_busy`, `already_in_stop`, `stop_needs_two`, `stop_not_found` | Avvalgidek |

## 8. Logist saytida nima qilindi (ma'lumot uchun)

- **Doska:** `Kutilmoqda` ustuni va yig'ma reyka olib tashlandi. Filtr, dashboard kartalari, statistika va bosqich chizig'ida ham u yo'q.
- **O'tishlar:** matritsa §2 bo'yicha, testlari bilan.
- **Yetkazildi va Atkaz oynalari:** «Kuryerga manzil» hisoblagichi `− N +` qo'shildi.
  Unda «Qo'shilmasin» va «Sukutga qaytarish» bor. Manzildagi zakazga izoh chiqadi.
  Qiymat PATCHda `courier_addresses` bo'lib ketadi.
- **Bo'lim nomi:** «To'xtashlar» endi «Manzillar».
  Takliflar panelida telefon+manzil guruhlari sariq ogohlantirish bilan tepada turadi.
  Kuryer har xil bo'lsa, «Birlashtirish» tugmasi sababi yozilgan holda qulflanadi.
