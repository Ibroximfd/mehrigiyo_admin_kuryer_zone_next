# Backend javoblari — 3 (2026-10-17): mahalla · kuryer manzil tahriri · chat havolalari · jonli kuzatish

Savollar: `HUDUD_BACKEND_TALABLAR_3.md`. ✅ — qilindi (develop + test server), ℹ️ — tushuntirish.
Migratsiyalar: `client 0012`, `shop 0106`, `courier_app 0010`, `operator 0050` — hammasi qo'shuvchi.

---

## 1. ✅ Mahalla / qishloq — `locality`

| Joy | Holat |
|---|---|
| `POST/PATCH /api/client/addresses/` | `locality` (string ≤120 \| null), javobda ham; erkin matn, faqat trim |
| `POST/PATCH /api/operator/orders/{id}/` | `locality` qabul qiladi (ixtiyoriy) |
| `PATCH /api/operator/logist/orders/{id}/` | `locality` va `delivery_address_text` (Q5) |
| `PATCH /api/courier/orders/{id}/address/` | `locality` (§2) |
| Hamma buyurtma javobi | `delivery.locality` (string \| null) — kuryer day-pack/detal/WS, logist ro'yxat/doska/detal, operator, admin |

- **Snapshot**: buyurtma manzildan yaratilganda `delivery.locality ← address.locality`; manzil keyin o'zgarsa buyurtma **o'zgarmaydi**.
- Eski yozuvlarda `null`. Migratsiya (eski `address_line` ni ajratish) qilinmadi — kelishilgandek.
- Mijoz manzilida `updated_by` ham bor (`"" | client | courier | logist`) — kim oxirgi aniqlashtirgani.

---

## 2. ✅ Kuryer manzilni tahrirlaydi

`PATCH /api/courier/orders/{id}/address/` — tanasi siz yozgandek, hammasi ixtiyoriy (`reason` majburiy):
`address_text`, `locality`, `district`, `lat`+`lng`, `note`, `reason`, `comment`, `apply_to_client_address`, `client_action_id`.

**Javob:** `200`, **buyurtma obyekti ILDIZDA** (kun paketi shakli, `{order: …}` qobig'i YO'Q — Q8), `version` oshgan.

Qoidalar (hammasi test bilan qulflangan):
- faqat shu buyurtma biriktirilgan kuryer (`404 order_not_assigned`), faqat `confirmed|shipping` (`409 order_closed`);
- hech narsa o'zgarmasa → `400 validation_error {detail: "O'zgarish yo'q"}`; `reason` noto'g'ri → `400 fields.reason`;
- nofaol/noma'lum tuman → `400 {code: validation_error, fields: {district: ["Noma'lum yoki nofaol"]}}` (Q13);
- `lat/lng` juft; `null,null` — tozalash (shunda mijoz manzilidagi nuqtaga qaytadi);
- `district`/nuqta o'zgarsa **zona qayta hisoblanadi**, kun paketida `leg` ham; `route_plan` tegilmaydi;
- `client_action_id` — idempotent (takror so'rov qayta yozmaydi, lenta ikkilanmaydi);
- **nuqta ustunligi**: buyurtmaning o'z nuqtasi (`delivery_lat/lng`) → mijoz manzili nuqtasi → geokod (hozir o'chiq).

Izlar:
- lentada `order.address_changed`, tanasi **`payload` ichida** (Q9): `{by, reason, comment, before, after, changed[]}`;
  `before/after` = `{address_text, locality, district, district_display, lat, lng}` — **`district_display` bor** (Q4);
- chatga tizim xabari: "Aziz Karimov (kuryer) manzilni o'zgartirdi: eski → yangi — izoh";
- logistga WS `order_updated` (`changes.address = {before, after, by, reason}`);
- kartada `delivery.address_changed_by: "courier" | "logist" | "client" | null`;
- kuryer izohi javobda **`delivery.courier_note`** (Q10) — mijoz izohi `delivery.note` alohida qoladi.

`apply_to_client_address: true` → mijozning `ClientAddress` i ham yangilanadi (`address_line`, `locality`, `district`,
`lat/lng`) va `updated_by: "courier"`. Sukut `false`.

---

## 3. ✅ Chatda havolalar
- Matn chegarasi **2000 → 4096** belgiga ko'tarildi (ilovalar shunga yozsin).
- `javascript:` (va `data:text/html`) bo'lgan xabar rad etiladi: `400 {fields: {text: ["Ruxsatsiz havola"]}}`
  (probel bilan yozilgani ham: `java script:`).
- `entities[]` qo'shilmadi — ilovalar o'zi linkify qiladi (kelishilgandek). Havola oldindan ko'rish yo'q.

---

## 4. Savollar 1–3
1. ℹ️ **Avtomatik ko'chiriladi**: buyurtma mijoz manzilidan yaratilsa `locality` snapshot bo'ladi. Operator qo'lda
   `locality` yuborsa — **o'shasi ustun** (yuborilgan qiymat yoziladi). Ya'ni har safar yuborish shart emas.
2. ℹ️ **Ha, qabul qilinadi** — "hozirgi joyim" GPS nuqtasi, aniqlik tekshiruvisiz (faqat `-90..90`/`-180..180`).
3. ℹ️ **Tasdiqlayman**: kuryer qiladi (`apply_to_client_address`), logist lentada va kartada ko'radi.

## 5. Savollar 4–7 (logist paneli)
4. ✅ `before/after` da `district` kodi bilan birga `district_display`.
5. ✅ Logist `PATCH` `locality` (va `delivery_address_text`) qabul qiladi.
6. ✅ Logist o'zgartirsa `address_changed_by: "logist"` + `order.address_changed` (`by: "logist"`, `reason: "clarified"`).
   Mijoz hozircha buyurtma manzilini o'zgartirmaydi (faqat o'z manzilini) — `"client"` qiymati zaxirada turibdi.
7. ✅ WS qisqa kartasida `delivery{address_text, locality, address_changed_by}`.
   ⚠️ `district_display` qisqa kartada YO'Q va ataylab: karta to'lov signali ichidan yasaladi, u yerda qo'shimcha
   so'rov qilib bo'lmaydi. Kerak bo'lsa kartadagi `district` kodidan `meta/regions` keshi bo'yicha chiqaring.

## 6. Savollar 8–13 (kuryer ilovasi)
8. ℹ️ Buyurtma **ildizda** (day-pack shakli). 9. ℹ️ `payload` ichida. 10. ℹ️ `delivery.courier_note`.
11. ℹ️ To'g'ri (juft `lat/lng`, `district_display` yuborilmaydi, `client_action_id` body'da).
12. ℹ️ `ETag` bor (`If-None-Match` → `304`), `Vary` da til/token yo'q.
13. ℹ️ Tasdiq: `{code: "validation_error", detail: "Tuman topilmadi", fields: {district: ["Noma'lum yoki nofaol"]}}`.

---

## 7. ✅ Jonli kuzatish

### 7.1 `POST /api/courier/location/`
Tanasi siz yozgandek (`points[]` + `device{}`), **eski bitta nuqta shakli ham ishlaydi**.
Javob: `{"ok": true, "saved": 3, "next_interval_s": 20}`.
- Har nuqtada: `lat, lng, accuracy, speed, heading, at, battery, is_mock, source` — hammasi saqlanadi.
- **Idempotent**: `(kuryer, vaqt)` takrori jimgina tashlanadi (baza darajasida) — oflayn navbat bemalol qayta yuborsin.
- Smena yopiq → `saved: 0` (xato emas). `at` 24 soatdan eski yoki 2 daqiqadan uzoq kelajakda → saqlanmaydi.
- Bir so'rovda ≤ 200 nuqta.
- `device.location_permission` va `gps_enabled` kuryerda saqlanadi (ogohlantirishlar shundan).
- `next_interval_s`: jonli oyna ochiq — **10 s**; harakatda (≥ 2 m/s) — **20 s**; to'xtaganda — **120 s**.
- Saqlash muddati **48 soat** (beat tozalaydi; ilgari 30 kun edi).

### 7.2 WS `courier_location` (filial guruhi)
`{courier_id, lat, lng, at, accuracy, speed, heading, is_mock, on_shift, battery}` — bir kuryer uchun **≤ 1 hodisa / 10 s**.

### 7.3 `GET /api/operator/couriers/live/` (yoki `GET /api/operator/couriers/?live=1` — Q15: **ikkalasi ham**)
Sukut bo'yicha faqat **smenadagilar**; `?all=1` — hammasi; `?zone=&region=&district=` filtrlari ishlaydi.
Har qatorda: `{id, full_name, phone, on_shift, last_location{lat,lng,at,accuracy,speed,heading,is_mock},
last_heartbeat_at, battery, location_permission, gps_enabled, current_order{id,order_number,address_text,lat,lng}|null,
today{assigned,delivered,cod_total}, alerts[]}`.
`alerts`: `permission_denied`, `gps_off`, `app_killed` (heartbeat > 3 daq), `stale` (nuqta > 5 daq), `mock_location` (10 daq).
⚠️ So'rovlar soni **kuryer soniga bog'liq emas** (test bilan qulflangan) — sahifani har 10 soniyada so'rash xavfsiz.
Bu so'rovning o'zi shu filial kuryerlariga "jadal rejim" (10 s) ni 60 soniyaga yoqadi.

### 7.4 `GET /api/operator/couriers/{id}/track/?from=&to=`
`{courier_id, from, to, points[{lat,lng,at,speed,accuracy,is_mock}], total_m, stops[{lat,lng,from,to,duration_s}]}`
— ≤ 48 soat, `stops` = 3 daqiqadan ko'p 50 m radiusda turganlar (server hisoblaydi).

### 7.5 Heartbeat
`POST /api/courier/heartbeat/` javobi endi: `{"ok": true, "tracking": "normal"|"intense", "next_interval_s": …}`.
`device{}` ni heartbeat bilan ham yuborsangiz ruxsat/GPS holati yangilanadi.

### 7.6 Savollar 14–18
14. ℹ️ **10 s qoladi** (sozlama, kodda bitta joyda). Amalda cheklamaydi: jonli oyna ochiq bo'lganda ilova ham 10 s da
    yuboradi. 5 s ga tushirish mumkin, lekin 50 kuryer = 600 hodisa/daqiqa — hozircha keraksiz.
15. ℹ️ Ikkalasi ham bor. Admin (`is_staff`) va logist — kuryer ro'yxati allaqachon filial cheklovisiz (zona modeli,
    R-02), ya'ni hamma filial ko'rinadi; `?region=`/`?zone=` bilan toraytiring.
16. ℹ️ **48 soat** (egasi). 7 kun kerak bo'lsa bitta sozlama — ayting.
17. ℹ️ **Masofa allaqachon bor edi**: isbotda `distance_to_address_m` va `anomaly_flags` ichida `far_from_address`
    (chegara 300 m, sozlama `COURIER_FAR_FROM_ADDRESS_M`), logistda `/operator/logist/anomalies/` ro'yxati.
    **Yangi**: `mock_location` bayrog'i — ilova `location.is_mock` yuborsa yoki oxirgi nuqtalar soxta bo'lsa.
18. ℹ️ **Tayyor.** 50 kuryer × 3000 nuqta = 150 ming qator/kun, 48 soat saqlanadi ≈ 300 ming qator (~40 MB) — kichik.
    Yozish to'plam bilan (`bulk_create`), oxirgi nuqta kuryer qatorida denormalizatsiya qilingan, jonli ro'yxat
    so'rovlari kuryer soniga bog'liq emas, WS throttle 10 s. Nuqtalar 48 soatdan keyin o'chadi.
