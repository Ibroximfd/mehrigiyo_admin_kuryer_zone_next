# Backend uchun talablar — 3 (2026-10-17): mahalla maydoni · kuryer manzilni tahrirlaydi · chatda havolalar

Egasi qarori. Ustuvorlik: 🔴 kerak · 🟡 foydali. Ilovalar shu shartnomaga qarab yozilmoqda — farq bo'lsa darhol ayting.

## 1. 🔴 Mahalla / qishloq — alohida `locality` maydoni (№32 javobiga)

**Qayerda:** mijoz manzili (`/api/client/addresses/`), buyurtma yetkazish bloki (`delivery`), operator/logist PATCH.

| Joy | O'zgarish |
|---|---|
| `POST/PATCH /api/client/addresses/` | yangi ixtiyoriy `locality: string(≤120) \| null`; javobda `locality` |
| `POST /api/operator/orders/`, `PATCH /api/operator/orders/{id}/` | `locality` qabul qiladi (yoki manzil tanlanganda manzildan ko'chiradi) |
| Hamma buyurtma javoblari (`delivery{}`): kuryer day-pack/detal/WS, logist ro'yxat/doska/detal/WS, operator, admin | `delivery.locality` (string \| null) |
| Manzildan buyurtma yaratilganda | `delivery.locality` ← `address.locality` (snapshot, manzil keyin o'zgarsa buyurtma o'zgarmaydi) |

- `locality` **ixtiyoriy**, tekshiruv yo'q (erkin matn), faqat trim + 120 belgi.
- Eski yozuvlarda `null`. Ilovalar: `null` → ko'rsatilmaydi, manzil satri avvalgidek.
- **Migratsiya (ixtiyoriy, bir martalik):** avvalgi "qo'lda tuman, mahalla, ko'cha" tarzida yozilgan `address_line` larni ajratish shart emas — eski matn qoladi, yangi yozuvlar toza boradi.
- `district_display` bilan birga ilovalar manzilni shunday ko'rsatadi: `"<district_display> · <locality>"` + ko'cha qatori.

## 2. 🔴 Kuryer buyurtma manzilini tahrirlaydi

Mijoz manzilni noto'g'ri kiritgan bo'lsa, kuryer eshik oldida to'g'rilab ketadi. Logist ko'rsin, mijoz manzili ham yangilansin (ixtiyoriy belgi bilan).

**Endpoint:** `PATCH /api/courier/orders/{id}/address/`
```json
{
  "address_text": "Turkiston ko'chasi 7, 2-podyezd",   // ixtiyoriy
  "locality": "Navbahor MFY",                           // ixtiyoriy, null — tozalash
  "district": "fargona/qoqon_sh",                       // ixtiyoriy, null — tozalash; nofaol/noma'lum → 400 {district: [...]}
  "lat": 40.53, "lng": 70.94,                           // ixtiyoriy, ikkalasi birga; null,null — tozalash
  "note": "Qavat 3, domofon 12",                        // ixtiyoriy — delivery.note (mijoz izohi) emas, kuryer izohi: courier_note
  "reason": "client_error" | "moved" | "clarified" | "other",   // majburiy
  "comment": "Mijoz 7-uy dedi, 5 emas",                 // ixtiyoriy ≤200
  "apply_to_client_address": true                       // ixtiyoriy, sukut false (quyida)
}
```
**Javob:** `200` to'liq buyurtma obyekti (day-pack bilan bir xil shakl, `version` oshgan).

Qoidalar:
- Ruxsat: faqat **shu buyurtma biriktirilgan kuryer**, buyurtma `confirmed | shipping` (yetkazilgan/bekor qilinganda `409 order_closed`).
- Hech bo'lmaganda bitta maydon o'zgargan bo'lsin, aks holda `400 validation_error {detail: "O'zgarish yo'q"}`.
- `district`/`lat,lng` o'zgarsa zona qayta hisoblanadi (hozirgi mantiq); `route_plan` o'zgarmaydi, lekin kun paketida `leg` qayta hisoblanadi.
- **Timeline** yozuvi: `order.address_changed` `{by: "courier", courier: {id, name}, reason, comment, before: {address_text, locality, district, lat, lng}, after: {...}}` — logist detalida "Kuryer manzilni o'zgartirdi" bo'lib ko'rinadi.
- **WS** logistga: `order_updated` (to'liq karta) + chatga tizim xabari: `"Kuryer manzilni o'zgartirdi: <eski> → <yangi> (sabab)"` — mavjud tizim xabari mexanizmi bilan.
- **Push/WS mijozga:** `order_address_changed` (ixtiyoriy, 🟡) — mijoz ilovasi buyurtma detalini yangilaydi.
- `apply_to_client_address: true` bo'lsa va buyurtma mijozning saqlangan manzilidan yaratilgan bo'lsa — o'sha `ClientAddress` ham yangilanadi (`address_line`, `locality`, `district`, `lat/lng`) va `updated_by: "courier"` belgisi qo'yiladi; mijoz ilovasi keyingi ochilishda "Kuryer manzilingizni aniqlashtirdi" deb ko'rsatadi. Sukut `false` — faqat buyurtma o'zgaradi.
- Offline: ilova so'rovni navbatga qo'yib `client_action_id` bilan yuboradi — mavjud idempotentlik qoidasi shu endpointga ham tatbiq etilsin (`X-Client-Action-Id` yoki body `client_action_id`, qaysi biri hozir ishlatilayotgan bo'lsa).
- Logist panelida ham shu o'zgarish ko'rinsin: buyurtma detalida "Manzil tarixi" (timeline'dan), kartada "Manzil kuryer tomonidan o'zgartirilgan" belgisi (`delivery.address_changed_by: "courier" | "logist" | "client" | null` — 🟡 qulaylik uchun to'g'ridan-to'g'ri maydon).

## 3. 🟡 Chatda havolalar (kuryer ↔ logist)

Ilovalar havolalarni **o'zi** ajratib ko'rsatadi (linkify) — backend o'zgarishi shart emas. Lekin foydali:
- Xabar matnida `https://…`, `www.…`, telefon (`+998 …`) va `#ORD-…` buyurtma raqamlari — ilovalar o'zi topadi.
- 🟡 Agar `message.entities[]` (`{type: "url"|"phone"|"order", offset, length, value}`) qo'shilsa — ilovalar undan foydalanadi, aks holda o'zi topadi. Shart emas.
- 🟡 Havola **oldindan ko'rish** (title/rasm) hozircha kerak emas.
- Xavfsizlik: xabar matni 4096 belgigacha; havola `javascript:` sxemasi bo'lsa server rad etsin (`400`).

## 4. Savollar
1. `locality` ni operator buyurtmasida manzil tanlanganda avtomatik ko'chirasizmi, yoki har safar yuboraylikmi?
2. Kuryer manzil tahririda `lat/lng` ni kuryer "hozirgi joyim" deb GPS'dan yuborsa — qabul qilasizmi (aniqlik tekshiruvisiz)?
3. Mijoz manzilini yangilashga (`apply_to_client_address`) kuryerga ruxsat beramizmi, yoki faqat logist tasdiqlasinmi? Egasi qarori: **kuryer qiladi, logist ko'radi** — tasdiqlang.

## 5. Qo'shimcha savollar (logist paneli, 2026-10-17)
4. `order.address_changed.before/after` da `district` kodi bilan birga `district_display` ham kelsin (hozir kod ko'rinadi).
5. Logist `PATCH /operator/logist/orders/{id}/` ham `locality` qabul qiladimi? (Panel yuboradi.)
6. Logist/mijoz manzilni o'zgartirganda ham `delivery.address_changed_by: "logist"|"client"` va `order.address_changed`
   yozuvi bo'lsinmi? (Panel ikkalasini ham o'qiydi.)
7. WS qisqa kartada `delivery{address_text, locality, address_changed_by}` kelsin — refetchsiz yangilanadi.

## 6. Kuryer ilovasi — shartnoma aniqliklari (2026-10-17)
8. `PATCH .../address/` `200` javobi — buyurtma obyekti **ildizda** (day-pack shakli) deb kutilmoqda; `{order: {…}}`
   qobiq bo'lsa ham o'qiladi — qaysi biri aniq?
9. `order.address_changed` timeline tanasi (`before/after/reason/comment/by/courier`) ildizdami yoki `data`/`payload`
   ichidami? (Ikkalasi o'qiladi.)
10. Kuryer izohi (`note`) javobda qaysi maydonda qaytadi — `delivery.courier_note`? Hozir faqat yuboriladi.
11. `lat/lng` doim juft yuboriladi; `district_display` yuborilmaydi; `client_action_id` body'da (mavjud qoida).
12. `/api/meta/regions/` javobida `ETag` bo'lishi kutilmoqda (bo'lmasa har safar to'liq yuklanadi).
13. 400 tuman xatosi — `{code: validation_error, fields: {district: [...]}}` shaklida, tasdiqlang.

## 7. 🔴 Kuryerni real vaqtda kuzatish (egasi qarori, 2026-10-17)

Maqsad: logist har bir smenadagi kuryer **qayerda turganini xaritada jonli** ko'radi, kechikish ≤ 30 s (harakatda),
to'xtab turganda ≤ 2 daqiqa. Kuryer aldab bo'lmasin: fonda ham yuboriladi, soxta GPS aniqlanadi, uzilish ko'rinadi.
Hozirgi `location_ping_s: 300` (5 daqiqa, faqat ilova ochiq paytda) — bekor.

### 7.1 Kuryer ilovasi nima yuboradi (biz qilamiz)
- Smena ochiq paytda **fon xizmati** (Android foreground service "Mehrigiyo — smenada", iOS background location).
  Smena boshlashda "Doim ruxsat" (Always) talab qilinadi — bermasa smena ochilmaydi (aldashga qarshi).
- **Adaptiv chastota** (batareya uchun):
  - harakatda (tezlik > 2 m/s yoki siljish > 50 m): **har 15–30 s**;
  - to'xtab turganda: **har 2 daqiqa** (yoki 50 m siljiganda darhol);
  - ilova old fonda va marshrut ekrani ochiq: har 10 s.
- Nuqtalar **to'planib** yuboriladi: har 30 s yoki 5 nuqta yig'ilganda bitta `POST`, oflaynda lokal navbatda saqlanadi
  (24 soatgacha), tarmoq qaytganda ketma-ket yuboriladi (eng eskisi birinchi).
- Har nuqtada: `lat, lng, accuracy, speed, heading, at, battery, is_mock, source: "gps"|"network"|"fused"`.
- `is_mock` (Android `isMock`/`isFromMockProvider`, iOS — jailbreak/simulyator belgisi) → nuqta baribir yuboriladi,
  server belgilaydi.

### 7.2 Backend
**`POST /api/courier/location/`** — body kengayadi (eski shakl ham qabul qilinsin):
```json
{ "points": [ { "lat": 41.31, "lng": 69.24, "accuracy": 8.0, "speed": 4.2, "heading": 135, "at": "…Z",
                "battery": 0.63, "is_mock": false, "source": "fused" } ],
  "device": { "platform": "android", "app_version": "1.3.0", "location_permission": "always"|"while_in_use"|"denied",
              "gps_enabled": true } }
→ 200 { "ok": true, "saved": 3, "next_interval_s": 20 }
```
- `saved` — smena yopiq bo'lsa 0 (xato emas). `next_interval_s` — server ilovaga chastotani buyurishi mumkin
  (masalan, logist "jonli kuzatish" oynasini ochganda 10 s). Ixtiyoriy, bo'lmasa ilova o'zi hal qiladi.
- Saqlash: `courier_track` jadvali (`courier_id, at, lat, lng, accuracy, speed, heading, battery, is_mock, source`),
  **48 soat** saqlanadi (keyin o'chiriladi yoki 5 daqiqalik nuqtalarga siyraklashtiriladi).
- `Courier.last_location` yangilanadi (`lat, lng, at, accuracy, speed, heading, is_mock`), `last_heartbeat_at` ham.
- Idempotentlik: bir xil `(courier_id, at)` takror kelsa e'tiborsiz.
- Eski nuqtalar (`at` 24 soatdan eski yoki kelajakda > 2 daqiqa) — rad etilmaydi, `saved` ga kirmaydi.

**WS logistga (filial guruhi):** `courier_location {courier_id, lat, lng, at, accuracy, speed, heading, is_mock,
on_shift, battery}` — **throttle: bir kuryer uchun ≤ 1 hodisa / 10 s** (oxirgi nuqta). Logist bir nechta filial
kuryerini ko'rsa (admin) — barcha guruhlar.

**`GET /api/operator/couriers/live/`** (yoki mavjud `couriers/` ga `?live=1`) → smenadagi hamma kuryer:
`[{id, full_name, phone, on_shift, last_location{lat,lng,at,accuracy,speed,heading,is_mock}, last_heartbeat_at,
battery, location_permission, gps_enabled, current_order{id, order_number, address_text, lat, lng} | null,
today{assigned, delivered}, alerts: ["gps_off"|"permission_denied"|"stale"|"mock_location"|"app_killed"]}]`
— sahifa ochilganda bir marta, keyin WS bilan yangilanadi. `alerts` ni server hisoblaydi:
- `stale` — oxirgi nuqta > 5 daqiqa, lekin heartbeat bor (GPS yo'q/ruxsat yo'q);
- `app_killed` — heartbeat ham > 3 daqiqa yo'q, smena ochiq;
- `mock_location` — oxirgi 10 daqiqada `is_mock: true` nuqta bor;
- `gps_off` / `permission_denied` — `device` blokidan.

**`GET /api/operator/couriers/{id}/track/?from=&to=`** → `{points: [{lat,lng,at,speed,accuracy,is_mock}], total_m,
stops: [{lat,lng,from,to,duration_s}]}` — kun izi (logist "qayerda yurgan" ni ko'radi), ≤ 48 soat; `stops` —
3 daqiqadan ko'p bir joyda turganlar (server hisoblaydi, 50 m radius).

**Yetkazish isboti tekshiruvi (aldashga qarshi):** `deliver` da yuborilgan `location` buyurtma `lat/lng` dan
> 300 m bo'lsa buyurtmada `delivery_distance_m` va `flags: ["far_from_address"]`; `is_mock` bo'lsa `["mock_location"]`
— logist kartada belgi ko'radi, kunlik hisobotda ro'yxat. (Mavjud bo'lsa — tasdiqlang, qanday nomda.)

**Heartbeat** (`POST /courier/heartbeat/`) — avvalgidek 60 s; fon xizmati ishlayotganda ham ketadi.
Javobga `next_interval_s` va `tracking: "normal"|"intense"` qo'shilsa — logist jonli oynani ochganda server
`intense` beradi (10 s), yopganda `normal`. Ixtiyoriy (🟡).

### 7.3 Logist sayti (biz qilamiz)
- "Kuryerlar" sahifasida **"Jonli xarita"** — OpenStreetMap (Leaflet, kalit kerak emas), hamma smenadagi kuryer
  markerlari: harakat yo'nalishi (heading) bo'yicha strelka, rang: yashil < 1 daqiqa · sariq < 5 daqiqa · kulrang
  "aloqa yo'q" > 5 daqiqa · qizil `mock_location`/`far_from_address`. Marker bosilsa: ism, telefon, oxirgi vaqt,
  tezlik, batareya, joriy buyurtma va unga masofa, "Buyurtmalari", "Chat", "Kun izi".
- Kuryer kartasida ham mini-holat: "2 daqiqa oldin · 12 km/soat · 63%" va ogohlantirish belgilari.
- "Kun izi" — tanlangan kuryer yo'li xaritada chiziq + to'xtashlar.
- WS `courier_location` → marker silliq siljiydi (animatsiya), ro'yxat qayta chizilmaydi (faqat marker).
- Performans: ≤ 50 kuryer — oddiy markerlar; undan ko'p bo'lsa klaster.

### 7.4 Savollar
14. `courier_location` WS throttle 10 s mosmi, yoki 5 s qila olasizmi (OSRM/DB yukini hisobga olib)?
15. `couriers/live/` alohida endpointmi yoki `couriers/?live=1`? Admin uchun hamma filial.
16. Kun izi (`track/`) 48 soat yetadimi, yoki 7 kun kerakmi (egasi: hozircha 48 soat)?
17. Mavjud `deliver` da masofa/mock tekshiruvi bormi? Bo'lmasa qo'shing (yuqorida).
18. Android fon xizmati tufayli nuqtalar ko'payadi (bir kuryer ≈ 1500–3000 nuqta/kun). DB va WS yukiga tayyormi?

## 8. 🔴 Kuryer profil rasmi (egasi qarori, 2026-10-17)

Maqsad: kuryer ilovada o'z rasmini qo'yadi; logist saytidagi jonli xaritada kuryer **rasmi va ismi** bilan ko'rinadi.

### 8.1 Kuryer ilovasi → backend
- **`POST /api/courier/me/avatar/`** — `multipart/form-data`, maydon `file` (JPEG/PNG/WebP/HEIC, ≤ 5 MB).
  Ilova oldindan kvadrat qilib qirqadi va 512×512 JPEG (~80–150 KB) qilib siqadi.
  → `200 {avatar: {url, thumb_url, updated_at}}`.
  Server: EXIF olib tashlansin, 512 px (asl) va **96 px** (`thumb_url`, xarita markeri uchun) variantlari saqlansin,
  fayl nomi tasodifiy (keshni buzish uchun `?v=<updated_at>` ham bo'ladi). Xato: `400 {fields: {file: ["…"]}}`
  (format/hajm), `413` (juda katta).
- **`DELETE /api/courier/me/avatar/`** → `204` (rasm o'chadi, `avatar: null`).
- `GET /api/courier/me/` → `courier.avatar` hozir `null` turadi — endi `{url, thumb_url, updated_at} | null`
  (eski satr shakli bo'lsa ham ilova o'qiydi).
- Moderatsiya hozircha yo'q; admin vebda (`/api/admin/couriers/{id}/`) rasmni ko'rish va **o'chirish**
  (`DELETE /api/admin/couriers/{id}/avatar/`) — nomaqbul rasm bo'lsa.

### 8.2 Logist/admin javoblarida
- `GET /api/operator/couriers/`, `couriers/live/`, `couriers/{id}/`, `GET /api/admin/couriers/` —
  har kuryerda `avatar: {url, thumb_url, updated_at} | null`.
- WS `courier_location` ga qo'shish **shart emas** (rasm kamdan-kam o'zgaradi). Rasm o'zgarganda logistlarga
  WS `courier_updated {courier_id, avatar}` (yoki mavjud kuryer yangilanish hodisasi) — sahifa yangilanmasdan almashadi.
- Rasm URL'lari **CORS'siz `<img>` bilan** yuklanadigan bo'lsin (media domen), `Cache-Control: public, max-age=31536000,
  immutable` (URL o'zgaradi — kesh muammo emas).

### 8.3 Savollar
19. `thumb_url` 96 px (retina uchun 2x — 48 px marker) mosmi? Kvadrat qirqishni server ham qiladimi (ilova qirqqan bo'lsa ham)?
20. Media domen va saqlash: mavjud `uploads` (yetkazish rasmlari) bilan bir joydami? Kuryer o'chirilsa rasm ham o'chadimi?
