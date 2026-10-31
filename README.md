# Mehrigiyo Bosh kuryer (`mehrigiyo_main_courier_next`)

Bosh kuryerlar uchun alohida veb-sayt. Shartnoma — `../mehrigiyo_platform_tz/21_TUZILMA_V2_OWNER_FILIAL_DOSTAVKA_REJA.md` (§4.5, §5, §5a, §5b, §6).

**Bo'limlar:**
- **Zakazlar** (`/`) — logist bergan zakazlarni kuryerlarga zona bo'yicha taqsimlash: avto yoki qo'lda.
- **Kuryerlar** (`/couriers`) — kuryer yaratish (parol bir marta ko'rinadi), zonaga biriktirish, boshqa zonaga o'tkazish, bloklash.
- **Zonalar** (`/zones`) — o'z viloyatlari ichida zona yaratish; tuman va shaharlarni qo'shish, olib tashlash, boshqa zonaga o'tkazish.
- **Sklad** (`/sklad`) — bitta sklad hamma viloyatlar uchun: skladlar xaritasi, qoldiq va kuryerlar ombori (faqat ko'rish).
- **Kassa** (`/cash`) — kuryerlardan pul qabul qilish va har filialga alohida, to'liq summa bilan topshirish.
- **Moliya** (`/report`) — bugun / kecha / oraliq: kuryerlar, filiallar bilan hisob (manzil × bitta narx), mahsulotlar.

## Backend

Haqiqiy backend v2 (sukut — test server, `config/servers.mjs`). Kirish: `POST /api/operator/login/ {site: "chief"}`.
Ulangan endpointlar: `chief/me|orders|orders/{id}|orders/auto-assign/preview|apply|couriers|couriers/{id}/cod|settle|zones|places|filials|finance|cash|cash/handover|cod/handovers`,
`sklad/me|sklads|stock|couriers`. Backenddan hali kerak bo'lganlar — `docs/BACKEND_KERAK_V2.md`,
savollar — `docs/BACKEND_SAVOLLAR_V2_2026-10-31.md`.

## Demo rejim (ixtiyoriy)

`APP_DEMO=1 npm run dev` — sayt backendga chiqmaydi, har so'rovga brauzerdagi namuna baza javob beradi
(`src/lib/demo/mock/` — haqiqiy backend shaklida). Ulanish nuqtasi bitta: `src/lib/api-client.ts` → `request()`.
Kirish: telefon `90 000 00 00`, parol `Chief-2026`. Sahifa yangilansa namuna boshidan.

## Ishga tushirish

```bash
npm install
npm run dev
```

Sayt `https://localhost:3030` da ochiladi. Sukutda test server ishlatiladi (`config/servers.mjs`).

Kirish — bosh kuryer akkaunti bilan. Bosh kuryerni asosiy filialning bosh logisti logist saytida yaratadi.
