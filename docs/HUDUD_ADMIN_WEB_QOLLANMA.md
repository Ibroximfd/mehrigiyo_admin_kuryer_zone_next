# Hududiy taqsimlash — ADMIN VEB qo'llanmasi (REST `/api/admin/…`), 2026-10-15

Alohida veb-admin uchun (egasi qarori Q2). Backend test serverda `https://imorganic.uz` (commit `5cb3fa8`).
Xato shakli hamma joyda: `{code, detail, fields?}`. Hamma javob JSON, sanalar ISO (`…Z`).

Admin — Django `is_staff` (yoki `is_superuser`) foydalanuvchi. Filial admini (`Operator.is_admin`) **emas**.
Logist/operator tokeni bilan `/api/admin/…` → `403 forbidden`.

Tushunchalar: `region` — viloyat kodi; `district` — tuman kodi `"<region>/<slug>"` (**backend beradi, kod
o'zgarmaydi, admin faqat NOMINI tahrirlaydi**); `zone` — tumanlar guruhi + kassa (**faqat shu yerda** yaratiladi);
`cash_point` — zona kassasi: filial yoki shaxs.

---

## 1. Kirish
`POST /api/admin/login/` `{"phone": "998901234567", "password": "…"}`
→ `200 {access, refresh, user: {id, phone, is_superuser}, server_time}`
Xato: `400 invalid_credentials` (noto'g'ri yoki staff emas — ikkisi ham bir xil javob).
Keyin har so'rovda `Authorization: Bearer <access>`. Yangilash — umumiy `/api/token/refresh/` (loyihadagi mavjud).

## 2. Ma'lumotnoma (tokensiz, hamma ilova bilan umumiy)
- `GET /api/meta/regions/` → `[{region, name, districts: [{code, region, name_uz, name_ru, name_uz_cyrl, kind: "city"|"district", is_active}]}]`. `ETag`/`If-None-Match` → `304`.
- `GET /api/meta/zones/?region=` → faol zonalar `[{id, name, region, district_codes[], cash_point: {kind, name}}]`.
- `POST /api/meta/geo/resolve/ {lat, lng}` → `{region, district, district_display, confidence, server_time}` (xarita ko'rinishi uchun).

## 3. Tumanlar (nom tahriri) — sahifa "Tumanlar"
| | |
|---|---|
| `GET /api/admin/districts/?region=fargona` | `[{code, region, name_uz, name_uz_cyrl, name_ru, kind, is_active, has_boundary, zone_id}]` |
| `PATCH /api/admin/districts/{code}/` | istalgan: `name_uz`, `name_uz_cyrl`, `name_ru`, `is_active` → yangilangan tuman |

- `code` ichida `/` bor (`fargona/qoqon_sh`) — URL'da to'g'ridan-to'g'ri yoziladi: `/api/admin/districts/fargona/qoqon_sh/`.
- `name_uz` bo'sh → `400 validation_error {name_uz: ["Majburiy"]}`; `404 not_found`.
- `is_active=false` → tuman zonasidan chiqadi, shu tumandagi ochiq buyurtmalar zonasi qayta hisoblanadi; manzil formalarida ko'rinmaydi.
- `has_boundary=false` — chegarasi yo'q (Yangihayot, Bo'zatov): xaritadan avto topilmaydi, faqat qo'lda tanlanadi.
- `zone_id` — qaysi zonada (`null` — zonasiz).
UI: viloyat tanlovi → jadval (nom 3 tilda inline tahrir, faol/nofaol, zona ustuni).

## 4. Zonalar — sahifa "Zonalar"
| | |
|---|---|
| `GET /api/admin/zones/?region=` | `{zones: [...], unzoned_districts: [{code, name}]}` — `unzoned_districts` faqat `region` berilganda (R-11) |
| `POST /api/admin/zones/` | `{region, name, district_codes: [], cash_point: {...}, neighbor_zone_ids: []}` → `201` zona |
| `GET /api/admin/zones/{id}/` | zona |
| `PATCH /api/admin/zones/{id}/` | istalgan: `name`, `cash_point`, `district_codes` (**to'liq ro'yxat, almashtiradi**), `neighbor_zone_ids`, `is_active` |

Zona shakli:
```json
{"id": 7, "region": "fargona", "name": "Qo'qon markaz", "is_active": true,
 "district_codes": ["fargona/qoqon_sh", "fargona/beshariq"],
 "cash_point": {"kind": "filial", "filial_id": 2, "user_id": null, "name": "Mehrigiyo Qo'qon"},
 "neighbor_zone_ids": [8]}
```
`cash_point` yuborish: `{"kind": "filial", "filial_id": 2}` yoki `{"kind": "person", "user_id": 15}`
(`user_id` — tizim foydalanuvchisi, masalan kassir operator). Filiallar ro'yxati — `GET /api/admin/filials/`,
xodimlar (shaxs kassa uchun) — `GET /api/admin/cash-users/?search=` (5a-band).

Qoidalar/xatolar:
- Har tuman ko'pi bilan **bitta** zonada: `409 district_in_zone` `fields.district_codes` — qaysi tuman qaysi zonada.
- `400 validation_error`: noma'lum/nofaol tuman, boshqa viloyat tumani, bo'sh nom, kassa topilmadi, `neighbor_zone_ids` boshqa viloyat.
- `is_active=false` → zona tumanlari bo'shatiladi (boshqa zonaga berish mumkin), ochiq buyurtmalarda `zone=null`, kuryerlardan bog'lanish olinmaydi (ular boshqa zonaga ko'chirilishi kerak).
- Har o'zgarishda logist doskalariga WS `zone_updated` ketadi; tegishli ochiq buyurtmalar qayta hisoblanadi.
UI: viloyat → zonalar kartalari; zona tahriri: nom, tumanlar (ko'p tanlov; zonasizlar alohida ro'yxatda), kassa (filial/shaxs), qo'shni zonalar, faol.

## 5. Kuryerlar — sahifa "Kuryerlar" (akkaunt FAQAT shu yerda, R-03)
| | |
|---|---|
| `GET /api/admin/couriers/?zone=&region=&on_shift=true\|false` | hamma kuryer (faol + nofaol) |
| `POST /api/admin/couriers/` | `{full_name, phone, zone_ids: [] (MAJBURIY, birinchisi asosiy), password?, create_account?: true}` → `201` kuryer (+ `password` — BIR MARTA, keyin qaytmaydi) |
| `GET /api/admin/couriers/{id}/` | kuryer |
| `PATCH /api/admin/couriers/{id}/` | `full_name`, `phone`, `password`, `is_active`, `zone_ids` (to'liq ro'yxat) → kuryer (+ `password` berilgan bo'lsa) |
| `POST /api/admin/couriers/{id}/set-password/` `{password}` | akkaunt ochadi/parol yangilaydi; **hamma qurilma uziladi** → `{id, phone, password, has_account, device}` |
| `POST /api/admin/couriers/{id}/deactivate/` | kirish yopiladi, token o'ladi, **ochiq buyurtmalari bo'shaydi** → `{id, is_active: false}` |
| `POST /api/admin/couriers/{id}/logout-device/` | faqat qurilma uziladi, parol qoladi → `{id, logged_out, has_account, device}` |

Kuryer shakli:
```json
{"id": 12, "full_name": "Ali Karimov", "phone": "998901110001", "is_active": true,
 "region": "fargona", "zone_ids": [7, 9], "zones": [{"id": 7, "name": "Qo'qon markaz"}],
 "filial": {"id": 2, "name": "Mehrigiyo Qo'qon"}, "today": {"assigned": 3, "delivered": 2, "cod_total": "310000"},
 "load": 1, "has_account": true,
 "device": {"device_name": "Redmi", "platform": "android", "app_version": "1.2.0", "since": "…", "last_seen_at": "…"} | null,
 "on_shift": true, "online": true, "last_heartbeat_at": "…", "last_location": {"lat", "lng", "at"} | null}
```
- `filial` — kassa filiali (asosiy zona kassasi filial bo'lsa o'sha; shaxs bo'lsa bosh filial). Alohida yuborilmaydi.
- `load` — ochiq buyurtmalar, hamma filial bo'yicha.
- Parol: kamida 6 belgi (`400 validation_error {password: ["Kamida 6 belgi"]}`). `create_account: true` va `password` yo'q — server o'zi yasaydi (javobda).
- `409 phone_taken` — bu raqamda **faol** kuryer bor (`detail`da kimligi). Mijoz akkaunti bor raqam — to'siq emas (alohida kuryer akkaunti ochiladi); o'chirilgan eski kuryer raqamni band qilmaydi.
- `400 validation_error {zone_ids: ["Majburiy"]}` — zonasiz kuryer bo'lmaydi; `{zone_ids: ["Topilmadi"]}` — nofaol/yo'q zona.
- `404 courier_not_found`.
UI: jadval (ism, telefon, zonalar, smenada/onlayn, yuklama, akkaunt holati, qurilma); yaratish/tahrir formasi;
"Parol berish" (natijani bir marta ko'rsatib nusxalash), "Qurilmani uzish", "O'chirish" (tasdiq bilan).

## 5a. Yordamchi ro'yxatlar
- `GET /api/admin/filials/` → `[{id, name, region, is_main, is_active}]` — kassa/filial tanlovi.
- `GET /api/admin/cash-users/?search=` → `[{user_id, full_name, username, phone, filial{id,name}, is_logist, is_admin}]`
  — kassa "shaxs" uchun xodimlar (100 tagacha).
- `GET /api/admin/couriers/?search=<ism|telefon>&is_active=true|false&zone=&region=&on_shift=` — sahifalash yo'q.
- `PATCH /api/admin/couriers/{id}/ {is_active: true}` — o'chirilgan kuryerni qayta yoqish (akkaunt ham qaytadi, parol saqlangan).

## 6. Viloyat sozlamasi — sahifa "Sozlamalar"
`GET /api/admin/regions/{region}/settings/` → `{region, auto_assign: "off"|"suggest"|"full"}`
`PATCH /api/admin/regions/{region}/settings/` `{"auto_assign": "full"}` → o'sha shakl.
`400 validation_error` noto'g'ri qiymat; `404 not_found` noma'lum viloyat.

| Rejim | Ma'nosi |
|---|---|
| `off` | taklif ham yo'q — logist hammasini qo'lda |
| `suggest` (sukut) | server taklif qiladi, logist bir bosishda tasdiqlaydi |
| `full` | server `confirmed` bo'lishi bilan o'zi biriktiradi (faqat zona kuryeri + smenada); logist istalgan vaqtda o'zgartiradi |

UI: viloyatlar ro'yxati, har birida 3 holatli tanlov + izoh. Tavsiya: boshida `suggest`.

## 7. Filiallararo hisobot — `GET /api/admin/cod/interfilial/?date_from=&date_to=`
`{date_from, date_to, rows: [{from_filial: {id, name}, to_filial: {id, name}, amount, handover_ids[]}], total}`
— admin HAMMA filial qatorlarini ko'radi. `from` — pul qabul qilingan kassa (filial), `to` — pul kimniki
(buyurtma filiali); faqat qabul qilingan topshiriqlar. Sana majburiy, ≤ 92 kun (`400 validation_error`).
Logist nusxasi `/api/operator/cod/interfilial/` — faqat o'z filiali qatorlari.
- Logist bo'limidagi kuryer amallari (`/api/operator/logist/couriers/…`) `is_staff` uchun ham ishlaydi, lekin admin veb `/api/admin/…` ni ishlatsin.

## 8. Sahifalar ro'yxati (tavsiya)
1. Kirish. 2. Zonalar (viloyat bo'yicha, xarita ixtiyoriy). 3. Tumanlar (nom tahriri). 4. Kuryerlar (akkaunt).
5. Viloyat sozlamalari. 6. Filiallararo hisobot.

Server: 201 tuman, 199 chegara; `geo_bootstrap` bilan har filial uchun zona va kuryerlar bog'langan (test
serverda bajarilgan) — admin ularni tahrirlab boshlaydi.
