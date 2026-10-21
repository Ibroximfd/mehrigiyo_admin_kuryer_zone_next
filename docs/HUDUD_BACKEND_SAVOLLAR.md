# Hududiy taqsimlash — backendga savollar (2026-10-15)

Ilovalar (kuryer, mijoz, logist sayti) HUDUD qo'llanmalariga moslandi. Quyidagilar aniqlashtirilsin.

## Umumiy
1. Viloyat `name` va `district_display` faqat o'zbekcha keladi (`X-Lang: ru` da ham). `name_ru`, `name_uz_cyrl`
   qo'shiladimi yoki `district_display` locale bo'yicha beriladimi?
2. Yangihayot va Bo'zatov chegarasi qachon qo'shiladi (hozir `resolve` topmaydi)?
3. `is_active:false` tumanlarni tanlovda yashiryapmiz. Shunday tumanli eski manzilga PATCH qanday javob beradi?

## Mijoz ilovasi
4. Xorijiy marketda (`X-Market` ≠ UZ) `region`/`district` kerak emas, server talab qilmaydi — tasdiqlang.
5. Tumansiz eski manzildan buyurtma kelsa `delivery.zone_id` lat/lng bo'yicha avtomatik aniqlanadimi?
6. Ilova `region` va `district` ikkalasini yuboradi. Shu ma'qulmi, yoki faqat `district`?
7. `/meta/regions/` da `Vary: X-Lang, Authorization` bor, lekin tana tilga bog'liq emas — ETag keshi
   keraksiz bo'linadi. `Vary` ni toraytirish mumkinmi?

## Kuryer ilovasi
8. Ko'p kunlik topshirish uchun bitta so'rov: `GET /courier/cod/outstanding/` (topshirilmagan kunlar ro'yxati)
   qilinadimi? Hozir ilova 7 kunni alohida-alohida so'raydi.
9. `cod/` javobining o'zida ham `cash_point{}` bo'lsa yaxshi (hozir faqat `/me/` va `handover` da).

## Logist sayti
10. Login yoki `me` javobida `is_staff` keladimi? `is_admin` bilan bir xilmi? (Akkaunt tugmalari shunga bog'liq,
    hozir hech kimga ko'rinmaydi.)
11. Kanonik yo'l qaysi: `/operator/logist/couriers/` yoki `/operator/couriers/`? Filtrsiz so'ralsa barcha filial
    kuryerlari keladimi, sahifalash bormi?
12. Buyurtma kartasida avto biriktirish belgisi qaysi nomda keladi (`courier_auto` / `auto_assigned` / …)?
13. `district_guess.confidence` shkalasi 0–1 mi yoki 0–100?
14. `order_suggestion` WS hodisasida `auto_hold` va `computed_at` keladimi?
15. Avto-taqsimlashda `unassigned.reason` to'liq ro'yxati (hozir: `no_zone`, `no_courier_on_shift`, `no_courier`,
    `capacity`, `auto_hold`)? `plan_expired` kodi bormi?
16. `orders/bulk/` ham `zone_mismatch` ogohlantirishini qaytaradimi?
17. `cash_point.kind` qiymatlari: `filial` va `person` (yoki `user`)?
18. Kuryerlar ro'yxatida `filial` doim obyektmi?
19. `/api/meta/regions/` javobi `region` + `name` shaklidami (`code` emas)?
20. Operator CRM dagi manzil formasi (viloyat/tuman majburiy) qaysi repoda — biz qilamizmi yoki backend/admin?

## Admin veb (`/api/admin/…`)
21. `GET /api/operator/filials/` admin (`is_staff`) tokeni bilan ochiqmi va aniq shakli qanday (massiv, `{results}` yoki
    `{filials}`)? Admin uchun alohida `GET /api/admin/filials/` qilinsa yaxshi.
22. Kassa "shaxs" (`kind: person`) uchun foydalanuvchilar (kassirlar) ro'yxati endpointi bormi? Hozir `user_id` qo'lda
    kiritiladi.
23. `GET /api/admin/couriers/` sahifalanadimi? Serverda qidiruv (`?search=`) bormi?
24. `set-password` da `password` majburiymi yoki bo'sh yuborilsa server o'zi yaratadimi?
25. `409 district_in_zone` da `fields.district_codes` ro'yxatmi yoki `{code: zona_nomi}` obyektmi?
26. O'chirilgan kuryerni qayta yoqish `PATCH {is_active: true}` bilan to'g'rimi (akkaunt/parol qaytadimi)?
27. Zona yaratishda `cash_point` majburiymi?
28. Admin bo'lmagan token bilan 403 javobida `code` aniq `"forbidden"` mi?
