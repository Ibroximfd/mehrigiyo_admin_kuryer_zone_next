# Backend javoblari — taqsimlash va marshrut (2026-10-16, savollar: `HUDUD_BACKEND_TALABLAR_2.md`)

✅ — qilindi (develop + test server), ℹ️ — tushuntirish, ⏳ — egasi qarori kutilmoqda.

## A. Logist sayti — taqsimlash

| # | Javob |
|---|---|
| 🔴 1 ✅ | `GET /api/operator/logist/orders/unassigned-counts/` → `{total, by_region: {fargona: 5, none: 1}, by_zone: {"7": 3, "none": 2}, by_district: {"fargona/qoqon_sh": 2, "none": 1}}` — `confirmed` + kuryersiz, logist filiali (admin — hamma). `"none"` — qiymati yo'qlar. |
| 🔴 2 ✅ | Tasdiqlayman: smenasiz kuryerga `PATCH {courier_id}` va `bulk assign_courier` **ruxsat** (server rad etmaydi; faqat `courier_inactive` — nofaol kuryer rad). Javobda endi `warnings: ["courier_off_shift"]` (va/yoki `"zone_mismatch"`), `warning` — birinchisi (eski maydon, saqlandi). Bulk: `warnings: [{id, warning}]` — har ogohlantirish alohida qator. `auto-assign/` ham shu `warnings` shaklida. |
| 🔴 3 ✅ | Login javobida `filial.region_code` (`"fargona"`), qo'shimcha `filial.lat`, `filial.lng` (depo). `filial.region` — eski erkin matn, qoladi. Kod filial nomidan/matnidan aniqlanadi; adashsa Django adminda `region` matnini to'g'rilang. |
| 🟡 4 ✅ | `POST auto-assign/ {plan_token, order_ids?: [], overrides?: []}` — `order_ids` berilsa rejaning faqat shu qismi qo'llanadi (yuklama hisobi serverda, `plan_stale` tekshiruvi faqat shu buyurtmalarga). `allow_off_shift` **kerak emas** — override'dagi smenasiz kuryer baribir qabul qilinadi, javobda `courier_off_shift` ogohlantirishi. |
| 🟡 5 ✅ | `unassigned[]` qatorlari: `{order_id, reason, order_number, client_name, zone_id, region, district, district_display}`. |
| 🟡 6 ✅ | `GET /api/operator/couriers/?district=<kod>[,<kod>]` — tuman(lar) zonasi kuryerlari. |
| ⚪ 7 ✅ | `?zone=7,8` — bir nechta id (vergul). |

## B. Kuryer ilovasi — marshrut

| # | Javob |
|---|---|
| 🔴 1 ✅ | **`POST /api/courier/route/optimize/`** `{from?: {lat, lng}, order_ids: [], now?}` → `{order_ids, total_distance_m, total_eta_s, legs: [{order_id, distance_m, eta_s}], source: "road"\|"estimate", skipped: []}`. `source: "road"` — o'z serverimizdagi OSRM (O'zbekiston xaritasi, bir tomonlama ko'chalar/ko'priklar hisobda), `"estimate"` — OSRM jim bo'lsa zaxira (to'g'ri chiziq + 2-opt). `from` berilmasa — filial deposi (`lat/lng` bo'lsa), bo'lmasa birinchi buyurtma. Koordinatasiz/yopilgan/begona id → `skipped` (ro'yxat oxirida). `eta_s` — jamlanma (yo'l + 5 daqiqa to'xtash). Marshrut SAQLANMAYDI — ilova ko'rib `PUT route/` bilan tasdiqlaydi. Ko'pi bilan 100 to'xtash. |
| 🔴 2 ✅ | `filial: {id, name, region_code, lat, lng}` — `me/`, kun paketi, buyurtma detali, WS `order`. `lat/lng` admin tomonidan to'ldiriladi (Django admin → Filial, yoki `PATCH /api/admin/filials/{id}/ {lat, lng}`); to'ldirilmaguncha `null` — null-safe. |
| 🟡 3 ✅ | `PUT /courier/route/` body kengaydi: `{order_ids, planned_from: {lat, lng, at}, total_distance_m, eta_s, reason?}` → javob `{updated, route_plan}`. Reja 48 soat saqlanadi, kun paketida `route_plan` (yoki `null`), logist kuryer kartasida `route_plan` ko'rinadi. |
| 🟡 4 ✅ | **Geokodlash — Google Geocoding API** (`HUDUD_GEOKODLASH_GOOGLE.md` bo'yicha; Yandex bekor). Kalit `GOOGLE_GEOCODING_API_KEY` (faqat serverda, egasi beradi), til `GOOGLE_GEOCODING_LANGUAGE=ru` (uz ham mumkin). So'rov: `address="<manzil>, <tuman>, <viloyat>, Uzbekistan"`, `components=country:UZ`, `region=uz`. Qachon: buyurtma yaratilganda va manzil o'zgarganda, `lat/lng` yo'q bo'lsa — bir marta, fonda; mijoz nuqtasi ustun. Saqlanadi: `geo_lat/geo_lng`, `geocode_status: ok\|failed\|pending\|expired`, `geocode_precision` (Google `location_type`: ROOFTOP\|RANGE_INTERPOLATED\|GEOMETRIC_CENTER\|APPROXIMATE), `place_id`, `address_issue: imprecise\|outside_district\|null`, `geocoded_at`. Tuman chegarasidan tashqari → `failed` + `outside_district`. `partial_match` / `GEOMETRIC_CENTER` / `APPROXIMATE` → `imprecise` → logist "manzilni aniqlashtiring" (`needs_review`), kuryer `route/optimize/` da oxirga. 30 kun qoidasi: kunlik vazifa ochiqlarni qayta geokodlaydi, yopilganlarda koordinata tozalanadi (`expired`, `place_id` qoladi). `OVER_QUERY_LIMIT`/429 → `pending`, eksponensial qayta (1→16 min); `ZERO_RESULTS` → `failed`; `REQUEST_DENIED` → log+Telegram. Kesh 30 kun (normalizatsiya qilingan matn). Backfill `manage.py geo_geocode_backfill` ≤ 10/s. |
| 🟡 5 ✅ | Kun paketida har buyurtmada `leg: {distance_m, eta_s, source: "road"\|"estimate"}` — marshrut tartibida oldingi to'xtashdan (birinchisi — filial deposidan, `lat/lng` bo'lsa), `eta_s` jamlanma. `"road"` — OSRM yo'l bo'yicha; OSRM jim bo'lsa `"estimate"` (to'g'ri chiziq, 25 km/soat). Yopilgan/koordinatasiz buyurtmada `null`. |
| ⚪ 6 ✅ | Buyurtmada `service_time_s: 300` (hozircha umumiy sozlama; keyinchalik mijoz bo'yicha). |

## B4 — YAKUNIY (2026-10-16 kechqurun, `HUDUD_GEOKODLASH_QAROR.md`): geokodlash O'CHIQ
Budjet yo'q, kalit berilmaydi. Google kodi qoladi, lekin **kalitsiz rejim butunlay jim** (tasdiqlayman):
- so'rov ketmaydi, Celery navbati/qayta urinish yo'q, Telegram ogohlantirishi yo'q;
- kunlik "30 kun" vazifasi va `geo_geocode_backfill` hech narsa qilmaydi (`off`);
- buyurtma javobida `delivery.geocode = null` va `delivery.geocode_status/geocode_precision = null` (`pending` EMAS);
  `?geocode=review` bo'sh;
- koordinata faqat mijoz/operator xaritadan tanlaganda — `delivery.lat/lng` avvalgidek; koordinatasiz buyurtma normal:
  `route/optimize/` da `skipped`, kun paketida `leg: null`;
- `/api/meta/geo/resolve/`, zonalar, taqsimlash, OSRM marshrut, `route_plan`, `unassigned-counts`, `filial.lat/lng` —
  o'z holida ishlaydi.
Kalit `.env` ga qo'yilgan kuni hammasi avtomatik yonadi (kod o'zgarmaydi).

## B4 javoblarda (kalit BO'LGANDA; hozir hammasi null)
`delivery.lat`, `delivery.lng` (mijoz nuqtasi, bo'lmasa geokod), `delivery.geocode_status`, `delivery.geocode_precision` —
hamma buyurtma javobida (kuryer `day-pack`/detal/WS, logist ro'yxat/doska/detal, operator). To'liq blok `delivery.geocode{…}`.
Eski buyurtmalarda `null`/`pending` — null-safe.
**Savollarga:** (1) hajm — kuniga qo'lda yozilgan manzilli buyurtmalar soni ≈ so'rovlar soni (mijoz xaritadan
tanlaganlari so'ralmaydi, takror matn keshdan); Google bepul krediti oyiga $200 (~40 000 geokod) — hozirgi hajmda
xarajat 0 kutiladi; aniq raqamni kalit kiritilgach 1 haftalik logdan beramiz. (2) `ru`/`uz` sinovi — kalit kelgach
20 real manzilda o'tkazib natijani yozamiz; sukut `ru`.

## C. Avvalgi ochiq savollar (№29–32)
Bizdagi savollar faylida 28 ta savol bor — №29–32 kelmagan. Qayta yuboring (tumanni `null` bilan tozalash: logist
`PATCH {district: null}` ishlaydi, mijoz manzilida `PATCH {district: null}` ham; qolganlarini matnini ko'rib javob beramiz).

## Migratsiya
`operator 0049` — `Filial.lat/lng` (qo'shuvchi). Test server yangilandi.
