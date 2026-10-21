# Mehrigiyo Admin

Hududiy yetkazish boshqaruvi uchun veb-admin: zonalar, tumanlar, kuryer
akkauntlari, viloyat avto-taqsimlash rejimi va filiallararo naqd hisobot.
API shartnomasi — [`docs/HUDUD_ADMIN_WEB_QOLLANMA.md`](docs/HUDUD_ADMIN_WEB_QOLLANMA.md)
(yagona manba). Qarorlar va taxminlar — [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Ishga tushirish

```bash
npm install
npm run dev:test     # test server (https://imorganic.uz) — http://localhost:3040
npm run dev:prod     # production backend
```

`scripts/dev.mjs` ikkita narsani ko'taradi: Next dev serveri (3040) va kichik
proxy (3041) — `/api` ni backendga HTTPS orqali uzatadi (backend CORS
localhost'ga ruxsat bermaydi). Kirish — `is_staff` akkaunt telefoni va paroli.

Build: `npm run build` → `out/` (statik SPA). Production'da `/api` ni nginx
backendga uzatishi kerak.

## Muhit

Hammasi ixtiyoriy (`.env.example`):

| O'zgaruvchi | Ma'nosi |
|---|---|
| `APP_SERVER` | `test` (sukut) yoki `prod` — `config/servers.mjs` |
| `NEXT_PUBLIC_API_BASE_URL` | API manzilini to'g'ridan-to'g'ri berish (sukut `/api`) |
| `PORT`, `DEV_PROXY_PORT` | dev portlari (3040 / 3041) |

## Sifat darvozasi

```bash
npm run lint && npx tsc --noEmit && npm run test
```

## Tuzilma

```
src/
├── app/                    # faqat marshrut va kompozitsiya
│   ├── login/              # kirish
│   └── (panel)/            # auth qo'riqchisi + karkas (_shell)
│       ├── page.tsx        # umumiy ko'rsatkichlar (_overview)
│       ├── zones/ districts/ couriers/ settings/ interfilial/
├── features/<nom>/
│   ├── model/              # zod sxema (javob chegarasi) + sof qoidalar + testlar
│   ├── api/                # ky so'rov + sxema bilan parse
│   ├── hooks/              # TanStack Query: kalit fabrikasi, mutatsiyalar
│   └── ui/                 # shu bo'limning komponentlari
└── shared/
    ├── config/             # env, marshrutlar, menyu
    ├── i18n/               # uz (asosiy) + ru lug'atlari, til tanlovi
    ├── lib/                # api-client, AppError, sessiya, format, telefon
    ├── hooks/              # media query, onlayn holat, debounce
    └── ui/                 # primitivlar (Radix) va holatlar galereyasi
```

Bog'liqlik qoidasi: `app → features → shared`; feature'lar bir-birini import
qilmaydi — bir nechta bo'lim ma'lumoti kerak bo'lsa, `app` dagi ekran yig'adi.
