@AGENTS.md

# Mehrigiyo — Bosh kuryer sayti (`mehrigiyo_chief`)

**Egasi qarori 2026-10-30:** viloyat bosh kuryerlari (`chief_courier` roli) **alohida saytda** ishlaydi — logist saytidan kirmaydi.
Repo eski `mehrigiyo_admin_next` (super-admin adminkasi) o'rnida; eski kod git tarixida (`57e5f00`).
Asos — logist sayti (`../mehrigiyo_operator_next`) karkasi: kirish, API client, dizayn tokenlari, i18n, panel.

## Bo'limlar (ildizda)
- `/` — Zakazlar: logistdan kelganlar, kuryerga qo'lda / avto taqsimlash, faollar (`/api/operator/chief/orders/*`)
- `/couriers` — o'z kuryerlari: yaratish (parol bir marta), attach/detach, zonalar (`/chief/couriers/*`)
- `/zones` — o'z viloyati zonalari (`/chief/zones/*`)
- `/cash` — kassa: 1-pog'ona kuryerdan qabul (`/logist/cod/handovers/`, `couriers/{id}/settle/`), 2-pog'ona bosh logistga topshirish (`/chief/cash/*`)
- `/stats` — kuryer bo'yicha yetkazildi, atkaz, manzil, haq (`/chief/stats/`)

Butun sayt `ChiefSiteGate` bilan: `GET /chief/me/` 200 bo'lmasa — «Bu sayt bosh kuryerlar uchun».
Kontrakt: qo'llanma §C (`FRONTEND_TOLIQ_QOLLANMA_2026_10_30`), savollar: `docs/BACKEND_SAVOLLAR_ADMIN_NEXT_2026-10-30.md` (K1–K9, P1–P8).

## Qoidalar (logist sayti bilan bir xil)
Skilllar: `nextjs-clean-architecture` + `nextjs-ui` + `clean-code-core`. Darvoza: `npm run lint && npx tsc --noEmit && npm run test`.
`npm run dev` (https://localhost:3030, proxy 3031), build, deploy — agent ishga tushirmaydi. Server: `config/servers.mjs` (`DEFAULT_SERVER = "test"`).
Tokenlar `src/app/globals.css`; endpointlar `src/lib/api-constants.ts`; kalitlar `src/lib/query-keys.ts`; matn o'zbekcha, ru — `src/lib/i18n/ru/*`.
`src/features/*` ichida logist saytidan qolgan, bu saytda ishlatilmaydigan kod bor (kuryer, zakaz, zona modellari kerak) — keyin tozalanadi.
