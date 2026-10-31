# Bosh kuryer sayti — backendga savollar (v2, 2026-10-31)

Javoblar: `JAVOBLAR_V2_SAVOLLAR_2026_10_31.md` («Bosh kuryer sayti V1–V19»).
Jonli JSON (test server, tokensiz) koordinator yig'di — kontrakt testi `src/lib/contract/chief-live.test.ts`.
Test akkauntida zakaz yo'q: to'la qatorlar (`by_filial`, `handovers`, preview qatorlari) hujjat shakli bo'yicha.

| # | Mavzu | Holat |
|---|---|---|
| V1 | `chief/me` shakli, `regions: null` | ✅ K1 shakli; `null` — «hamma viloyat». Frontend `null` ni bo'sh ro'yxat deb oladi. |
| V2 | Login `role` | ✅ `role: "chief_courier"` + `account_kind: "chief"`. Mapper taniydi. |
| V3 | Zakazlar qidiruvi va filtrlari | ✅ Serverga o'tdi (`q`, `zone_id`, `filial_id`, `region`, `district`, `page` — 10 tadan). |
| V4 | Zakaz detali va tarixi | ✅ Ulandi. |
| V5 | Avto-taqsimlash preview/apply | ✅ Ulandi. Tahrir UI'si qoldi. `client_action_id` idempotent emas — `BACKEND_KERAK_V2.md` §1. |
| V6 | Qo'lda joy | ✅ Ulandi. `403 zone_other_region` — tushunarli matn bilan. |
| V7/V8 | Sklad: faqat o'zi, qoldiq | ✅ Ulandi. «Backend hali chiqmagan» holatlari olib tashlandi. |
| V9 | `sklad/couriers` massiv, `stock` sahifali | ✅ Hujjatlandi. Ikkalasi ham o'qiladi. |
| V10 | `cod/handovers` filtr, tartib, sahifa | ✅ Ulandi. `filial_id` yo'q — UI'dan olindi. |
| V11 | Kuryer naqdi (e'lonsiz kunlar) | ✅ «Naqd hisobi» varag'i: kunma-kun, bir kun yoki hammasini birga qabul qilish. |
| V12 | `by_filial[].oldest_day` | ✅ Har filial uchun muddat («N kun kechikdi»). |
| V13 | `finance.by_courier[]`, `by_product[]` | ✅ Moliya faqat `chief/finance/` dan. `chief/stats/` ishlatilmaydi. |
| V14 | `chief/filials/` | ✅ Filtr shu yerdan. |
| V15 | WebSocket | Qayd — keyingi to'lqin. |
| V16/V17 | `sklad/me.regions`, `sklad_id` | ✅ Sklad shu bo'yicha tanlanadi. Viloyatlar `sklad/me` dan. |
| V18 | Zona kassa nuqtasi | ✅ Endi bosh kuryerning o'zi (`cash_point.kind: "person"`). |
| V19 | `today.cod_total` turi | ✅ Endi son. |

**Ochiq:** yo'q. Qolgan ish — `BACKEND_KERAK_V2.md` dagi idempotentlik va WS.
