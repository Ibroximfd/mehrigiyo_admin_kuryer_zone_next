# Hududiy taqsimlash — backend JAVOBLARI (2026-10-15, savollar faylga: `HUDUD_BACKEND_SAVOLLAR.md`)

Belgi: ✅ — shu javob bilan birga **qilindi** (develop + test server), ℹ️ — tushuntirish, ⛔ — qilinmaydi/hozircha yo'q.

## Umumiy
1. ✅ `district_display` endi **`X-Lang` bo'yicha**: `uz` → `name_uz`, `uz-Cyrl` → `name_uz_cyrl`, qolgan hamma til
   (`ru`, `kk`, `ky`, `en`, `tg`, `ar`) → `name_ru` (bo'sh bo'lsa `name_uz`). Hamma joyda: buyurtma `delivery.district_display`,
   manzil `district_display`, `geo/resolve`. `regions/` javobida uchala nom (`name_uz`, `name_ru`, `name_uz_cyrl`)
   allaqachon bor — tanlovda o'zingiz tanlang. Viloyat `name` — faqat o'zbekcha (viloyat nomlari backendda bir tilda;
   ilovada 14 ta satrni o'zingiz lokalizatsiya qiling, `region` kodi barqaror).
2. ⛔ Yangihayot va Bo'zatov — geoBoundaries (ochiq chegaralar bazasi) da yo'q (2020+ yangi tumanlar). Chegara
   topilsa qo'shamiz; hozircha `resolve` qo'shni tumanni qaytarishi mumkin — foydalanuvchi qo'lda tanlaydi
   (`has_boundary: false` admin ro'yxatida). Keyingi kutilma.
3. ℹ️ Nofaol tuman kodi bilan `POST/PATCH` → `400 validation_error` `{district: ["…does not exist"]}` (DRF standart).
   Eski manzilni tegmasdan `PATCH` qilsangiz (`district` yubormasdan) — o'tadi, tuman o'zgarmaydi. Ilovada: nofaol tuman
   ko'rsatilsa "tumanni qayta tanlang" deb so'rang.

## Mijoz ilovasi
4. ✅ Tasdiqlayman: server `region`/`district` ni **hech qachon talab qilmaydi** (bozor qat'i nazar). Xorijiy
   marketda yubormang.
5. ℹ️ Ha, ikki bosqichda: buyurtma yaratilganda manzil koordinatasidan `district_guess` hisoblanadi; buyurtma
   `confirmed` bo'lganda ishonch ≥ 0.9 bo'lsa `district` → `zone` **avtomatik** to'ladi. Pastroq bo'lsa logist tasdiqlaydi.
   `pending` da `zone_id: null` bo'lishi normal.
6. ℹ️ Ikkalasini yuborish ma'qul (viloyat tanlovi UI uchun kerak). Faqat `district` yuborsangiz ham `region` o'zi to'ladi.
   Nomuvofiq juftlik → `400`.
7. ✅ `/api/meta/regions/` va `/api/meta/zones/` da `Vary` toraytirildi: `X-Lang`, `Authorization`, `X-I18n` olib tashlandi (prodda qoladi: `Accept, X-Market, Origin` — boshqa qatlamlardan, tilga bog'liq emas) — ETag keshi til/token bo'yicha bo'linmaydi.

## Kuryer ilovasi
8. ✅ `GET /api/courier/cod/outstanding/` →
   `{days: [{date, amount, amount_display, computed_total, orders_count, settled: false, handover}], total, total_display, cash_point}`
   — oxirgi 31 kundagi **topshirilmagan** kunlar (bo'sh kunlar yo'q). Bitta so'rov.
9. ✅ `GET /api/courier/cod/` javobida `cash_point{}` qo'shildi.

## Logist sayti
10. ✅ `POST /api/operator/login/` javobida `is_staff` (yuqori daraja) va `operator.is_staff` qo'shildi; operator
    ro'yxatlarida ham `is_staff` bor. **`is_admin` ≠ `is_staff`**: `is_admin` — filial admini (CRM), `is_staff` —
    platforma admini (`/api/admin/…`, kuryer akkaunt tugmalari). Tugmalarni `is_staff` ga bog'lang.
11. ℹ️ Kanonik: **`/api/operator/couriers/`** (zona ro'yxati). `/api/operator/logist/couriers/` — eski manzil, bir xil
    javob. Filtrsiz — **hamma faol kuryer, hamma filial**, sahifalash yo'q (o'nlab yozuv). `?zone=&region=&on_shift=`.
12. ✅ Kartada `assigned_auto: true|false` (oxirgi biriktirish server tomonidan bo'ldimi — `full` rejim yoki avto reja;
    override/qo'lda → `false`). Lentada avvalgidek `payload.auto`.
13. ℹ️ `confidence` **0–1** (`1.0`, `0.7`, `0`). Foizga o'zingiz ko'paytiring.
14. ✅ WS `order_suggestion` da endi `auto_hold` (bool) va `computed_at` ham keladi.
15. ℹ️ `unassigned.reason` faqat ikkita: **`no_zone`**, **`no_courier_on_shift`**. `no_courier`, `capacity`, `auto_hold` —
    YO'Q. Qo'llashda xato kodi faqat **`plan_stale`** (muddat o'tgan ham, o'zgargan ham — bitta kod, `stale_order_ids[]`
    o'zgarganda keladi). `plan_expired` yo'q.
16. ✅ `POST orders/bulk/` javobida `warnings: [{id, warning: "zone_mismatch"}]` qo'shildi (`applied`/`failed` o'zgarmagan).
17. ℹ️ `cash_point.kind`: **`filial`** yoki **`person`** (`user` emas).
18. ℹ️ `filial` — obyekt `{id, name}` yoki `null` (nazariy; kuryer doim filialli). Null-safe yozing.
19. ℹ️ Ha: `[{region: "fargona", name: "Farg'ona", districts: [...]}]` — `code` emas, `region`.
20. ℹ️ Operator CRM saytidagi manzil formasi — **CRM frontend jamoasi** qiladi (backend `district` ni qabul qiladi:
    `POST/PATCH /api/operator/orders/…` da `district`, javobda `delivery.district*`). Backend/admin qilmaydi.

## Admin veb
21. ✅ `GET /api/admin/filials/` → massiv `[{id, name, region, is_main, is_active}]` (nofaollar oxirida).
    (`/api/operator/logist/filials/` logist uchun va o'z filialini chiqarib tashlaydi — admin uchun yaroqsiz edi.)
22. ✅ `GET /api/admin/cash-users/?search=` → `[{user_id, full_name, username, phone, filial{id,name}, is_logist, is_admin}]`
    — faol xodimlar (operator/logist/admin). `user_id` → `cash_point.user_id`. 100 tagacha, qidiruv ism/login/telefon.
23. ✅ Sahifalash yo'q (massiv). Qo'shildi: `?search=` (ism/telefon, `icontains`) va `?is_active=true|false`
    (+ avvalgi `zone`, `region`, `on_shift`).
24. ℹ️ `set-password/` da `password` **ixtiyoriy**: bo'sh/yo'q → server o'zi 8+ belgili parol yasaydi va javobda
    **bir marta** qaytaradi. Berilsa kamida 6 belgi.
25. ℹ️ `409 district_in_zone`: `fields: {district: ["fargona/qoqon_sh"], zone_id: [7]}` — ro'yxatlar (birinchi to'qnashgan
    tuman va uning zonasi); `detail` da zona nomi. Bir so'rovda bir nechta to'qnashuv bo'lsa birinchisi qaytadi.
26. ✅ Ha: `PATCH {is_active: true}` — endi **akkaunt ham qaytadi** (parol saqlangan, kuryer o'sha parol bilan kiradi;
    qurilmaga qayta kirish kerak). Avval faqat kuryer yozuvi yoqilib, akkaunt o'chiq qolardi — tuzatildi.
27. ℹ️ Ha, **majburiy** (`cash_point` yoki qisqa `filial_id`): kassasiz zona bo'lmaydi → `400 validation_error
    {cash_point: ["filial_id"]}`.
28. ℹ️ Ha, aniq `{"code": "forbidden", "detail": "Faqat admin uchun"}` (403). Tokensiz → `401` `code: not_authenticated`.

## Migratsiya / deploy
`shop 0103` (`assigned_auto`) — qo'shuvchi. Test server yangilandi. Hujjatlar: `HUDUD_FLUTTER_QOLLANMA.md`,
`HUDUD_LOGIST_SAYT_QOLLANMA.md`, `HUDUD_ADMIN_WEB_QOLLANMA.md` shu javoblarga mos yangilandi.

## Qo'shimcha (№29–32) — 2026-10-17
29. `district: null` — `PATCH /api/client/addresses/{id}/` va `PATCH /api/operator/orders/{id}/` ikkalasida qabul qilinadi
    (tuman va zona tozalanadi).
30. Operator CRM'da noto'g'ri/nofaol tuman **400 bermaydi** — region kabi jimgina bo'sh qoladi, buyurtma "Hududi
    noma'lum"ga tushadi; formada faqat ro'yxatdan tanlatish kerak. Logist PATCH'da esa `400 validation_error`,
    `fields.district: ["Noma'lum yoki nofaol"]`.
31. `delivery.district` va `delivery.district_display` — operator ro'yxati, doska, admin ro'yxati, logist
    ro'yxat/doska/detal va WS kartalarida bor.
32. Mahalla/qishloq uchun alohida `locality` maydoni yo'q, rejada ham yo'q — manzil matniga yoziladi. Kerak bo'lsa
    egasi qarori bilan qo'shiladi (~1 soat).
