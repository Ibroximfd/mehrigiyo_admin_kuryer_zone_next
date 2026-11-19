@AGENTS.md

# Mehrigiyo — Bosh kuryer sayti (`mehrigiyo_main_courier_next`, «Mehrigiyo Bosh kuryer»)

Viloyat bosh kuryerlari (`chief_courier` roli) **alohida saytda** ishlaydi. Repo eski `mehrigiyo_admin_next` o'rnida
(eski kod git tarixida, `57e5f00`); karkas logist saytidan (`../mehrigiyo_operator_next`) olingan, logist kodi tozalangan.

**Shartnoma:** `../mehrigiyo_platform_tz/21_TUZILMA_V2_OWNER_FILIAL_DOSTAVKA_REJA.md` §0, §4.5, §5, §5a, §5b, §6.
Reja aytmagan funksiya qo'shilmaydi. Kuryer haqini tizim **hisoblamaydi** — egasi qarori (2026-11-18,
`83_BOSH_KURYER_SOTUV_JADVALI…` §3): bosh kuryer «Sotuv jadvali»da qo'lda yozgan summa saqlanadi va «kassaga
topshiriladigan naqd»dan serverda ayiriladi (`handover_due`); frontend pulni ham, molni ham qayta hisoblamaydi.

## Bo'limlar (ildizda, navigatsiya ≤ 6)
- `/` Zakazlar — kuryerga zona bo'yicha qo'lda / avto (`/chief/orders/*`)
- `/couriers` Kuryerlar — yaratish, bitta zonaga biriktirish, o'tkazish, bloklash (`/chief/couriers/*`)
- `/zones` Zonalar — tuman/shaharlarni biriktirish va zonalar orasida o'tkazish (`/chief/zones/*`)
- `/sklad` Sklad — faqat o'z skladi va kuryerlari ombori (`sklad/me|sklads|stock|couriers`); `?view=` Kunlik (sukut) ·
  Sanadan sanagacha — `chief/report/sklad-sheet/` (+ `export/`, hujjat 85 §1, `features/sklad-sheet`) · Kuryerlar ombori
- `/cash` Kassa (hujjat 85 §3) — «Nima sotildi» + «Filialga topshirish» `chief/report/cash-sheet/` (`?p=day|range`);
  «Topshirdim» va tarix — `chief/cash/` + `chief/cash/handover/` (`filial_required`, `oldest_day`). «Kuryerdan qabul
  qilish» (`chief/cod/…`, `settle/`) olib tashlandi — kuryerdan pul `/sheet?tab=cash` «Pul olish»da
- `/report` Moliya — `chief/finance/` (filial, kuryer va mahsulot kesimi)
- `/sheet` Sotuv jadvali (hujjat 83; menyuda `secondary` — telefon pastki panelida yo'q) — kunlik «SOTUV» jadvali
  `chief/report/sales-sheet/` (+ `fee/` kuryer xizmati, `export/` Excel), «Pul olish» (hujjat 85 §2: `cash` bloki,
  `discount/`, `receipts/`) va «Berish rejasi» `chief/report/issue-plan/`. Jadval viloyat kesimida (hujjat 96 §6:
  `regions[]`, bo'lmasa kuryer viloyati `chief/couriers/` dan, jami `features/sales-sheet/regions.ts` da) va «Telegram matni»

Butun sayt `ChiefSiteGate` bilan: `GET /chief/me/` 200 bo'lmasa — «Bu sayt bosh kuryerlar uchun».

## Backend va demo
Sukut — haqiqiy backend v2 (`DEFAULT_DEMO = false`). Demo: `APP_DEMO=1` → `api-client` `request()` har so'rovni
`src/lib/demo/mock/router.ts` ga beradi (haqiqiy backend shakllari, xotiradagi `db.ts`). Yangi endpoint ulansa —
router'ga ham shu shaklda qo'shiladi. Istisno: `chief/report/sales-sheet/` (+ `fee/`, `export/`), `issue-plan/` va `chief/report/sklad-sheet/` (+ `export/`) uchun demo ma'lumot ATAYLAB yo'q —
haqiqiy hisob raqamlari (egasi, 2026-11-18); demoda ham 404 → «server hali chiqarmagan». `mock/` i18n qamrovidan tashqarida.
«Pul olish» (`sales-sheet` `cash` bloki, `…/discount/`, `…/receipts/`) va Kassa jadvali (`chief/report/cash-sheet/`) uchun ham demo
ma'lumot ATAYLAB yo'q — haqiqiy pul (egasi, 2026-11-18); demoda «server hali chiqarmagan». Backenddan kutilayotganlar:
`docs/BACKEND_KERAK_V2.md`, savollar: `docs/BACKEND_SAVOLLAR_V2_2026-10-31.md`.

## Qoidalar
Skilllar: `nextjs-clean-architecture` + `nextjs-ui` + `clean-code-core`. Darvoza: `npm run lint && npx tsc --noEmit && npm run test`.
`npm run dev` (https://localhost:3030, proxy 3031), build, deploy — agent ishga tushirmaydi. Server: `config/servers.mjs`.
Tokenlar `src/app/globals.css` (sklad xaritasi ranglari `--sklad-1…5`); endpointlar `src/lib/api-constants.ts`;
kalitlar `src/lib/query-keys.ts`; matn o'zbekcha, ru — `src/lib/i18n/ru/*` (qamrov testi bor).
