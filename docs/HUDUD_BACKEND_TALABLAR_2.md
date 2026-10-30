# Backend uchun talablar — taqsimlash va marshrut (2026-10-16)

Ilovalar hozir klient tomonda ishlaydigan eng yaxshi yechim bilan yurishi mumkin. Quyidagilar natijani
**aniq va tez** qiladi. Ustuvorlik: 🔴 — kerak, 🟡 — foydali, ⚪ — ixtiyoriy.

## A. Logist sayti — taqsimlash

| # | Talab | Nega |
|---|---|---|
| 🔴 1 | `GET /api/operator/logist/orders/unassigned-counts/` → `{by_region: {fargona: 5}, by_zone: {"7": 3, "none": 2}, by_district: {"fargona/qoqon_sh": 2}}` (status `confirmed`, kuryersiz) | Filtr qatoridagi sonlar hozir 100 talik ro'yxatdan sanaladi — 100 dan ko'p kuryersiz buyurtmada noto'g'ri bo'ladi |
| 🔴 2 | Smenasiz kuryerga biriktirish: `PATCH orders/{id} {courier_id}` va `bulk assign_courier` **ruxsat berilganini tasdiqlash**. Ogohlantirish kerak bo'lsa `warnings: [{id, warning: "courier_off_shift"}]` | Logist smenada bo'lmagan kuryerga ham biriktira olishi kerak (egasi talabi); UI tasdiq so'raydi, server rad etmasin |
| 🔴 3 | `POST /api/operator/login/` javobiga `filial.region` (viloyat kodi) | Taqsimlash oynasi sukut bo'yicha logist filiali viloyatini ochadi; hozir buyurtmalardan taxmin qilinadi |
| 🟡 4 | `POST auto-assign/` → `order_ids?: []` (rejaning qismini qo'llash) va `overrides[]` da `allow_off_shift: true` | "Tanlanganlarni qo'llash" hozir `plan_token`siz bulk orqali ketadi; server qismlab qo'llasa yuklama/zona hisobi bir joyda bo'ladi |
| 🟡 5 | `POST auto-assign/preview/` → `unassigned[]` ichida `zone_id`, `region`, `order_number`, `client_name`, `district_display` | Qatorda buyurtma raqami/mijoz/tuman va zona kuryerlarini ko'rsatish uchun hozir alohida ro'yxatdan qidiriladi |
| 🟡 6 | `GET /api/operator/couriers/?district=<kod>` | Tuman bo'yicha kuryer filtri hozir klientda zonalar orqali hisoblanadi |
| ⚪ 7 | `GET /api/operator/couriers/?zone=7,8` (bir nechta id) | Tuman bir nechta zonaga kirsa klient filtr qiladi |

Server tomonida allaqachon bor va ishlatilmoqda: buyurtmalar `?region=`, `?zone=<id>`, `?zone=none`,
`?district=`; kuryerlar `?region=&zone=&on_shift=`.

## B. Kuryer ilovasi — marshrut

| # | Talab | Nega |
|---|---|---|
| 🔴 1 | `POST /courier/route/optimize/` body `{from: {lat, lng}, order_ids: [], now}` → `{order_ids: [], total_distance_m, total_eta_s, legs: [{order_id, distance_m, eta_s}]}` (OSRM/Valhalla, yo'l masofasi) | Ilova hozir to'g'ri chiziq (haversine) + 2-opt bilan tartiblaydi — bir tomonlama ko'chalar, daryo/ko'prik, trafik hisobga olinmaydi |
| 🔴 2 | `GET /courier/me/` va kun paketida `filial: {id, name, lat, lng}` | GPS yo'qda yoki smena boshida depodan tartiblash; hozir faqat nom keladi |
| 🟡 3 | `PUT /courier/route/` kengaytirish: `{order_ids, planned_from: {lat, lng, at}, total_distance_m, eta_s}` | Logist panelida kuryer ETA'si va qayta tartiblash sababi ko'rinadi |
| 🟡 4 | Koordinatasiz buyurtmalarni serverda geokodlash: `address_text` → `lat/lng`, `geocode_status: ok\|failed` | Hozir koordinatasizlar tartib oxirida va xaritada ko'rinmaydi |
| 🟡 5 | Kun paketida har buyurtmaga `distance_m` / `eta_s` (oldingi to'xtashdan) | Ro'yxatda aniq raqam, haversine taxmini o'rniga |
| ⚪ 6 | Buyurtmada `service_time_s` | ETA'da 5 daqiqa o'rniga mijoz bo'yicha to'xtash vaqti |

## C. Avvalgi ochiq savollar
`HUDUD_BACKEND_SAVOLLAR.md` №29–32 (tumanni `null` bilan tozalash, operator `400 district` shakli,
ro'yxatda `district_display`, `locality` maydoni) hali javobsiz.
