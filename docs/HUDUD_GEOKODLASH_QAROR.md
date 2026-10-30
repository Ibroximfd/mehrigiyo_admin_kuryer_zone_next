# Geokodlash va xarita — YAKUNIY qaror (2026-10-16, kechqurun)

Egasi qarori: **hozircha Google ham, Yandex ham ishlatilmaydi** — budjet bo'lganda qaytamiz.
`HUDUD_GEOKODLASH_GOOGLE.md` va avvalgi Yandex yozuvlari **bekor**, ular keyingi bosqich uchun saqlanadi.

## Backend uchun — nima qilish kerak
Siz B4 ni Google Geocoding bilan qilib bo'ldingiz — rahmat, kod qolsin. Lekin **kalit berilmaydi** (billing yo'q), shuning
uchun quyidagilarni tekshirib/o'zgartirib bering:

0. **Kalitsiz rejim xavfsiz bo'lsin**: `GOOGLE_GEOCODING_API_KEY` bo'sh bo'lganda geokodlash umuman chaqirilmasin
   (so'rov, navbat, qayta urinish, Telegram ogohlantirishi — hech biri). Hozir `REQUEST_DENIED` → log+Telegram
   mantig'i bor — kalitsiz holatda u ishlamasin.
1. **Geokodlash (B4) o'chiq qolsin.** Google Geocoding integratsiyasi kodda qolaversin, lekin kalit bo'lmagani uchun
   ishga tushmasin: `GOOGLE_GEOCODING_API_KEY` bo'sh → geokodlash o'tkazib yuboriladi, buyurtmada
   `delivery.geocode = null` (yoki `status: "pending"` EMAS — `null`, aks holda logist paneli "Geokod kutilmoqda"
   ko'rsatadi). `geo_geocode_backfill` ishga tushirilmaydi.
2. **Koordinata faqat mijoz/operator xaritadan tanlaganida** (`lat/lng` avvalgidek). Koordinatasiz buyurtma —
   normal holat: `route/optimize/` da `skipped`, kun paketida `leg: null`.
3. **Xarita — avvalgidek**: ilovalar OpenStreetMap (flutter_map / flutter_osm_plugin) da qoladi, logist saytida
   xarita embed yo'q, faqat havolalar. Backenddan xarita uchun hech narsa kerak emas.
4. `/api/meta/geo/resolve/` (tuman aniqlash) — **ishlaydi, o'zgarmaydi** (bu bizning o'z chegaralarimiz, tashqi
   xizmat emas).
5. Qolgan hamma narsa (zonalar, taqsimlash, `route/optimize/` OSRM, `route_plan`, `unassigned-counts`, `filial.lat/lng`)
   — joriy holatda qoladi va ishlatiladi.

## Ilovalar (biz qildik)
- Kuryer ilovasi: flutter_map + OSM qaytarildi; `delivery.geocode*` maydonlari null-safe o'qiladi (kelsa — "Manzil taxminiy").
- Mijoz ilovasi: flutter_osm_plugin picker qaytarildi.
- Logist sayti: Google xarita embed olib tashlandi; geokod belgilari va `route_plan` ko'rinishi qoldi (null-safe).

## Savol
- Kalitsiz rejimda buyurtma javobidagi `delivery.geocode` aniq `null` bo'lishini tasdiqlang (`pending` emas).
- Kunlik "30 kun qoidasi" vazifasi (qayta geokodlash/tozalash) kalitsiz holatda ishga tushmasin — tasdiqlang.

## Keyinroq (budjet bo'lganda)
`HUDUD_GEOKODLASH_GOOGLE.md` 1–5 bo'limlari bo'yicha: $30 oldindan to'lov → 4 ta API → kalitlar → backend `.env`.
