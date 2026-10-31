# Bosh kuryer sayti — backenddan hali kerak (v2, 2026-10-31)

Shartnoma: `../mehrigiyo_platform_tz/21_TUZILMA_V2_OWNER_FILIAL_DOSTAVKA_REJA.md`.
Manba: backend hujjatlari va `JAVOBLAR_V2_SAVOLLAR_2026_10_31.md` («Bosh kuryer sayti V1–V19»).

## Yopildi — frontend haqiqiy endpointga ulandi

| Mavzu | Endpoint |
|---|---|
| Avto-taqsimlash rejasi, ko'rib chiqish va tahrirdan keyin yuborish | `POST chief/orders/auto-assign/preview/` → `apply/` (V5) |
| Zakaz detali va tarixi | `GET chief/orders/{id}/` + `history[]` (V4) |
| Qidiruv va filtrlar, 10 tadan sahifa | `chief/orders/?q=&zone_id=&filial_id=&region=&district=&page=` (V3) |
| Filiallar ro'yxati | `GET chief/filials/` (V14) |
| Qo'lda kiritilgan joy | `POST chief/places/` (`zone_other_region` ko'rsatiladi) (V6) |
| Faqat o'z skladi, sklad qoldig'i | `sklad/me` (`sklad_id`, `regions`), `sklad/sklads/`, `sklad/stock/` (V7, V8, V16, V17) |
| Kassa 1-pog'ona: oraliq, tartib, sahifa | `chief/cod/handovers/?date_from=&date_to=&ordering=&page=` (V10) |
| Kuryer naqdi, e'lonsiz kunlar ham | `GET chief/couriers/{id}/cod/` (V11) |
| Filial bo'yicha topshirish muddati | `chief/cash/ by_filial[].oldest_day` (V12) |
| Kuryer va mahsulot kesimi | `chief/finance/ by_courier[].by_product[]` (V13) |

## Qolgani

1. **`auto-assign/apply/` idempotentligi.** Backend `client_action_id` ni qabul qiladi, lekin saqlamaydi (javoblar §1–§6).
   Tarmoq qayta yuborsa, allaqachon biriktirilgan zakaz `failed` ga tushadi. Frontend qayta yubormaydi. Kerak bo'lsa — saqlash.
2. **Kassa 1-pog'onada filial filtri — backend rad etdi (V10).** `CodHandover` filialsiz, shuning uchun filtr UI'dan olib tashlandi.
   Filial bo'linishi qator ichida `by_filial` sifatida ko'rinadi. Ish yo'q, qayd.
3. **WebSocket (V15).** `chief_*` hodisalari tayyor, sayt hozir so'rov bilan yangilanadi. Kerak bo'lsa keyingi to'lqinda ulanadi.
4. **Zakazda `filial` maydoni yo'q** (jonli: `chief/orders/` va `chief/orders/{id}/`).
   Zakaz detalidagi «Filial» qatori «—» bo'lib qoladi, garchi `?filial_id=` filtri ishlasa ham.
   Kerak: zakaz obyektida `filial: {id, name}` (sotgan filial).
5. **Manzilni tuzatish** (`25_MANZIL_OZGARISHI` §5.1). Frontend tayyor, 404 kelsa «backend kutilmoqda» deydi.
   - `PATCH chief/orders/{id}/address/ {district, address_text?, landmark?, reason, note?}`.
   - `reason`: `client_error | clarified | moved | other`.
   - Begona viloyat tumani → `403 zone_other_region`.
   - Zona o'zgarsa va kuryer yangi zonada bo'lmasa — kuryer olinadi.
   - Javob: yangilangan zakaz (`chief/orders/{id}/` shaklida).
6. **Logistga qaytarish** (§5.2). Frontend tayyor.
   - `POST chief/orders/{id}/return/ {reason, note?}`.
   - `reason`: `wrong_region | address_unknown | client_unreachable | other`; `other` uchun `note` majburiy.
   - Zakaz `chief/orders` ro'yxatlaridan chiqadi.
7. **Zakaz obyektida maydonlar** (§5.5):
   - `delivery.address_changed_by` — `"chief"` qiymati ham;
   - `delivery.landmark`;
   - `return_reason`;
   - tarixda `address_changed`, `returned_to_logist` hodisalari.
8. **Sklad mahsulotida rasm yo'q.**
   - `sklad/stock/` va `sklad/couriers/` dagi `item{}` da `image` (to'liq URL) kerak.
   - `chief/finance/ by_product[].item` va `by_courier[].by_product[]` da ham kerak.
   - Hozir frontend nom bosh harflarini ko'rsatadi.
9. **`me.permissions` da `view.analytics` kaliti yo'q.**
   - Frontend kalit kelmaguncha «Moliya» ni ochiq qoldiradi, `false` kelsa yopadi.
   - Qolgan 5 kalit (`orders.dispatch`, `couriers.manage`, `zones.manage`, `cash.accept`, `warehouse.view_courier_stores`) kelmasa yopiq hisoblanadi.
