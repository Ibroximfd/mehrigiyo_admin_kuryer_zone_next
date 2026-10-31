@AGENTS.md

# Mehrigiyo — Bosh kuryer sayti (`mehrigiyo_main_courier_next`, «Mehrigiyo Bosh kuryer»)

Viloyat bosh kuryerlari (`chief_courier` roli) **alohida saytda** ishlaydi. Repo eski `mehrigiyo_admin_next` o'rnida
(eski kod git tarixida, `57e5f00`); karkas logist saytidan (`../mehrigiyo_operator_next`) olingan, logist kodi tozalangan.

**Shartnoma:** `../mehrigiyo_platform_tz/21_TUZILMA_V2_OWNER_FILIAL_DOSTAVKA_REJA.md` §0, §4.5, §5, §5a, §5b, §6.
Reja aytmagan funksiya qo'shilmaydi. Kuryer haqi tizimga kirmaydi.

## Bo'limlar (ildizda, navigatsiya ≤ 6)
- `/` Zakazlar — kuryerga zona bo'yicha qo'lda / avto (`/chief/orders/*`)
- `/couriers` Kuryerlar — yaratish, bitta zonaga biriktirish, o'tkazish, bloklash (`/chief/couriers/*`)
- `/zones` Zonalar — tuman/shaharlarni biriktirish va zonalar orasida o'tkazish (`/chief/zones/*`)
- `/sklad` Sklad — faqat o'z skladi va kuryerlari ombori (`sklad/me|sklads|stock|couriers`)
- `/cash` Kassa — 1-pog'ona `chief/cod/handovers/`, `chief/couriers/{id}/cod|settle/`; 2-pog'ona `chief/cash/` + `chief/cash/handover/` (`filial_required`, `oldest_day`)
- `/report` Moliya — `chief/finance/` (filial, kuryer va mahsulot kesimi)

Butun sayt `ChiefSiteGate` bilan: `GET /chief/me/` 200 bo'lmasa — «Bu sayt bosh kuryerlar uchun».

## Backend va demo
Sukut — haqiqiy backend v2 (`DEFAULT_DEMO = false`). Demo: `APP_DEMO=1` → `api-client` `request()` har so'rovni
`src/lib/demo/mock/router.ts` ga beradi (haqiqiy backend shakllari, xotiradagi `db.ts`). Yangi endpoint ulansa —
router'ga ham shu shaklda qo'shiladi. `mock/` i18n qamrovidan tashqarida. Backenddan kutilayotganlar:
`docs/BACKEND_KERAK_V2.md`, savollar: `docs/BACKEND_SAVOLLAR_V2_2026-10-31.md`.

## Qoidalar
Skilllar: `nextjs-clean-architecture` + `nextjs-ui` + `clean-code-core`. Darvoza: `npm run lint && npx tsc --noEmit && npm run test`.
`npm run dev` (https://localhost:3030, proxy 3031), build, deploy — agent ishga tushirmaydi. Server: `config/servers.mjs`.
Tokenlar `src/app/globals.css` (sklad xaritasi ranglari `--sklad-1…5`); endpointlar `src/lib/api-constants.ts`;
kalitlar `src/lib/query-keys.ts`; matn o'zbekcha, ru — `src/lib/i18n/ru/*` (qamrov testi bor).
