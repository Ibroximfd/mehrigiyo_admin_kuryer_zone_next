# Qarorlar va taxminlar

Sana: 2026-10-15. Manba shartnoma: `HUDUD_ADMIN_WEB_QOLLANMA.md`.

## Arxitektura

- **Stack** logist sayti (`mehrigiyo_operator_next`) bilan bir xil versiyalarda:
  Next 16.3.1, React 19.2, Tailwind v4, ky 2, zod 4, TanStack Query 5, nuqs 2,
  react-hook-form 7, Radix (`radix-ui`), sonner, next-themes, zustand.
- **Statik eksport** (`output: "export"`): panel login ortida, SEO kerak emas.
  Shuning uchun auth tekshiruvi brauzerda (`RequireAuth`), middleware yo'q.
- **Qatlamlar**: `app → features → shared`. Feature'lar orasida import yo'q:
  zonalar sahifasiga tumanlar va kuryerlar soni `app/(panel)/zones/zones-screen.tsx`
  da yig'ilib, props orqali beriladi.
- **Javob chegarasi**: har endpoint javobi zod sxemasi bilan parse qilinadi va
  shu sxemada camelCase domen turiga o'giriladi. Ixtiyoriy maydon `null`/yo'q
  bo'lsa ham yiqilmaydi; majburiy maydon buzilsa — `AppError(kind: "parse")`.
- **Xatolar**: backend `{code, detail, fields?}` → `AppError {kind, status, code,
  detail, fields}`. Forma xatolari `mapFieldErrors` bilan maydonlarga
  (`setError`), qolgani umumiy xato sifatida ko'rsatiladi.
- **Sessiya**: `localStorage` (logist saytidan boshqa kalitlar). 401 → bir marta
  `/api/token/refresh/` → yana 401 bo'lsa chiqish. 403 (`admin/…`, kod
  `forbidden`) → "admin emas" ekrani; boshqa 403 — joyida xato.
- **i18n**: oddiy turlangan lug'at (`shared/i18n/uz.ts`, `ru.ts`), `ru` turi `uz`
  shakliga majburan mos. Logist saytidagi DOM-tarjima yondashuvi ataylab
  olinmadi — admin kichik va matnlar kodda turlangan bo'lgani ishonchliroq.
  Backend'ga `X-Lang: uz|ru` yuboriladi (logist sayti kabi).
- **Shrift**: Inter `next/font/google` orqali (latin, latin-ext, cyrillic,
  cyrillic-ext) — build paytida internet kerak.
- **Dizayn**: semantik tokenlar (`globals.css`), oklch, alohida qorong'i rejim.
  Brend — "organik" yashil. Komponentlarda hex/arbitrary qiymat yo'q
  (`viewport.themeColor` bundan mustasno — meta teg CSS o'zgaruvchisini o'qimaydi).
- **Moslashuv**: `lg` dan kichikda pastki menyu (4 bo'lim + "Menyu" varag'i),
  `lg+` da yon panel. Jadvallar faqat `xl` (≥1280px) da — undan torroqda
  kartochkalar (yon panel bilan `lg` da kontentga ~690px qoladi). Oynalar
  telefonda pastki varaq, formalar telefonda deyarli to'liq ekranli varaq.

## Backend javoblari bilan aniqlangan (`HUDUD_BACKEND_JAVOBLAR.md`, 2026-10-15)

- **#21 Filiallar** — `GET /api/admin/filials/` → massiv `[{id, name, region, is_main, is_active}]`.
  Faqat massiv qabul qilinadi (avvalgi `{results}`/`{filials}` taxminlari olib tashlandi).
  Kassa tanlovida: zona viloyati filiallari tepada, keyin boshqa viloyatlar, nofaollar
  oxirida va tanlab bo'lmaydi; asosiy filial "(asosiy)" deb belgilanadi
  (`zones/model/filial.ts` → `groupFilialOptions`). Joriy kassa filiali ro'yxatda
  bo'lmasa ham nomi bilan ko'rinadi.
- **#22 Kassa — shaxs** — `user_id` qo'lda kiritilmaydi: `GET /api/admin/cash-users/?search=`
  bo'yicha qidiruvli tanlov (300 ms debounce, server ≤ 100 qaytaradi — 100 bo'lsa "aniqroq
  qidiring"). Formada `{userId, name}` saqlanadi; tahrirda nom `cash_point.name` dan,
  qidiruv ochilmaguncha so'rov yuborilmaydi.
- **#23 Kuryerlar ro'yxati** — sahifalash yo'q. Qidiruv (`?search=`, URL'da `q`, 300 ms
  debounce) va holat (`?is_active=true|false`, "hammasi"da yuborilmaydi) endi serverda;
  klient filtri olib tashlandi. `zone`, `region`, `on_shift` — avvalgidek.
- **#24 Parol** — "Avtomatik yaratish" (sukut; `password` yuborilmaydi, server 8+ belgili
  parolni javobda bir marta qaytaradi) yoki "O'zim kiritaman" (≥ 6). "Parol berish" va
  akkauntli yangi kuryer uchun bir xil. Klientda parol yasash olib tashlandi. `auto` da
  server parol qaytarmasa — ogohlantirish toast.
- **#25 409 `district_in_zone`** — `fields: {district: [code], zone_id: [id]}` + `detail`
  (zona nomi). Tumanlar maydoni ostida "«tuman» tumani «zona» zonasida band" ko'rinadi:
  tuman nomi ma'lumotnomadan, zona nomi viloyat zonalaridan, topilmasa `detail`
  (`mapZoneServerErrors`). Formada boshqa zonadagi tuman baribir o'chirilgan holda turadi.
- **#26 Qayta faollashtirish** — `PATCH {is_active: true}` akkauntni ham tiklaydi; endi
  tasdiq oynasi bilan: "eski parol bilan qurilmada qayta kiradi" (akkauntsiz kuryerga —
  "Parol berish" kerak).
- **#27 Kassa majburiy** — `400 {cash_point: ["filial_id"]}` tanlangan kassa turi maydoniga
  "Kassani tanlang" bo'lib tushadi (server qiymati matn emas, maydon nomi).
- **#28 403/401** — panel faqat aynan `403 {code: "forbidden"}` + `admin/…` yo'lida
  yopiladi (`isNotAdminError`); kodsiz/boshqa kodli 403 joyida oddiy xato. Tokensiz
  `401 not_authenticated` → refresh yo'q → sessiya tugaydi.
- **#1 Viloyat nomlari** — server faqat o'zbekcha beradi; `ru` da 14 viloyat nomi mahalliy
  lug'atdan, `region` kodi bo'yicha (`shared/i18n/region-names.ts`), noma'lum kod — server
  nomi. Tilga moslash `useRegions` `select` ida — kesh tilga bo'linmaydi.
- **#2 Chegara yo'q** — `has_boundary: false` tumanlar ro'yxatida "Chegara yo'q" belgisi va
  "xaritadan avtomatik topilmaydi" izohi bilan (avvaldan bor edi).

## Taxminlar (shartnomada aniq emas)

1. **PATCH faqat o'zgargan maydonlar** bilan yuboriladi (har o'zgarish logist
   doskalarida qayta hisob uyg'otadi). `district_codes` o'zgarsa — to'liq ro'yxat.
2. **Kuryer bitta viloyatda** ishlaydi: formada viloyat tanlanadi va faqat shu
   viloyatning faol zonalari taklif qilinadi. Viloyat o'zgarsa zonalar tozalanadi.
3. **Hisobot oralig'i**: ikkala chekka ham sanaladi, ≤ 92 kun; sukut — joriy
   oyning 1-kunidan bugungacha.
4. **Zona kartochkasidagi kuryerlar soni** — `GET /api/admin/couriers/?region=&is_active=true`
   dan `zone_ids` bo'yicha hisoblanadi.
5. **Umumiy sahifa**: "zonasiz tumanlar" = meta'dagi faol tumanlar − faol
   zonalar `district_codes`.
6. **Bo'sh ro'yxat**: sukut filtrida (faollar) kuryer bo'lmasa "Hali kuryer yo'q"
   ko'rsatiladi — nofaollar bo'lishi mumkin, ular "Holat" filtrida.

## Backend uchun ochiq savollar

- Yo'q (2026-10-15 javoblari bilan hammasi yopildi).
