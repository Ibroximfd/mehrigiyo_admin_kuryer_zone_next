# Backend'ga beriladigan paket — 2026-10-30 (yakuniy aniqlashtirish)

Maqsad — CRM, logist sayti va kuryer zanjirini to'liq ishga tushirish: aniqlashtirish → UI → test → prod.

## 1. Beriladigan fayllar (shu tartibda)

| # | Fayl | Nima haqida | Muhimligi |
|---|---|---|---|
| 1 | `docs/BACKEND_SAVOLLAR_ROLLAR_2026-10-30.md` | Asosiy hujjat. Ishga tushirish tartibi (0); har rol: bosh admin (A), bo'lim admini (B), operator (C), bosh logist (D), logist (E), bosh kuryer (F); umumiy (G); akkaunt boshqaruvi H1–H14; logistika zanjiri I (bosh kuryer platformasi, manzil soni, bir manzil narxi, statistika) | 🔴 birinchi |
| 2 | `docs/BACKEND_SOROVLAR_2026-10-30_AUDIT.md` | Test server auditi: chatga ruxsatsiz qo'shilish (`orders/{id}/join/` 404), bosh kuryer akkaunti, `seat.block`, `/sklad/filials/` 404, individual foizni olib tashlash va Pervichka/Baza shabloni | 🔴 |
| 3 | `docs/BACKEND_SOROV_YETKAZILDI_USTUNI_2026-10-30.md` | Dostavkada «Yetkazildi» ustuni, 24 soatdan keyin Baza — hamma lid uchun | 🔴 |
| 4 | `docs/BACKEND_SAVOLLAR_SKLAD_2026-10-30.md` | Sklad, Moliya, Analitika: test holati; TZ 18 rollari va yangi rollar; mol zanjiri (bosh kuryer bilan); «Jarayonda» bilan avtomatik minus; logistika stavkasi va operator foizi; viloyat va bosh kuryer kesimi | 🔴 |
| 5 | `docs/BACKEND_SAVOLLAR_ADMIN_NEXT_2026-10-30.md` | `mehrigiyo_admin_next` — super-admin vositasi, bosh kuryer uchun emas; bosh kuryer ish joyi (logist sayti `/chief`); `/chief/*` prodda 404; login 500; token yangilash 404 | 🔴 (egasi O1–O3 ga ham javob beradi) |

Fayllar logist sayti repo'sida (`mehrigiyo_operator_next/docs/`). 1-faylning nusxasi CRM repo'sida ham bor.

**Berilmaydi** — eski fayllar, javobi kelgan: `BACKEND_SOROVLAR_2026-10-30.md` (javobi — `BACKEND_JAVOBLAR_FRONTEND_2026_10_30.md`),
`HUDUD_*`, `MANZIL_SONI_*`, `LOGIST_OQIM_*`.

## 2. Backend'dan qaytishi kerak

1. **Javoblar fayli.** Har savolga raqami bilan javob: «A3: …», «H6: …», «I.4a: …». Har javobda endpoint, so'rov va javob JSON misoli bo'lsin.
2. **Yangi endpointlar** test serverga chiqsin:
   - `staff-chat/orders/{id}/join/`;
   - bir manzil narxini belgilash (I.4);
   - bosh kuryer akkaunti (F1);
   - «Yetkazildi» ustuni (3-fayl);
   - `department_kind` foiz shabloni;
   - rol uchun `PATCH` (A5);
   - viloyat bo'yicha statistika (I.5a).
3. **Testda akkauntlar.** Har rol uchun bittadan: `zone_admin`, `department_admin`, `seller`, `chief_logist`, `logist`, `chief_courier`, kuryer.
   Login va parol **alohida yo'l bilan** beriladi, chatda emas.
4. **Testdagi bayroqlar** ro'yxati (`ORDER_CHAT_MEMBERSHIP`, `OPERATOR_CANCEL_NEEDS_LOGIST_REVIEW`, `handover_enabled`) va prodda qachon yoqiladi.
5. **Prod uchun ro'yxat:** migratsiyalar, bir martalik buyruqlar (`grant_staff_role` …), `.env` o'zgaruvchilari.

## 3. Javob kelgach — frontend ishi

1. **Moslash.** Javob bo'yicha UI'ni moslaymiz. Hozir taxmin bilan qilingan joylar:
   - dopusk katalogi shakli;
   - rol dopusklarini o'zgartirish;
   - bosh kuryer akkaunti;
   - Pervichka/Baza shabloni;
   - «Yetkazildi» ustuni.
2. **Yangi UI:**
   - logist Moliya/Statistika: «Bir manzil narxi» (bosh logist);
   - viloyat → bosh kuryer → kuryer statistikasi;
   - kuryer haqini yopish.
3. **Testda tekshirish (har rol akkaunti bilan):**
   - H1–H14 jadvali;
   - ssenariy: zakaz → bosh kuryer → kuryer → yetkazildi → manzil soni → statistika va pul;
   - lid: Pervichka → yetkazildi → 24 soat → Baza;
   - chat: qidirib qo'shilish;
   - foiz: shablon → hafta yopish → to'landi.

   Natijani rol bo'yicha ✅/❌ bilan yozib beramiz.
4. **Prod.** Hamma ✅ bo'lgach: `config/servers.mjs` → `prod`, build, deploy (foydalanuvchi o'zi qiladi).
   Keyin egasi bayroqlarni yoqadi va prodda tezkor tekshiruv o'tkaziladi.
