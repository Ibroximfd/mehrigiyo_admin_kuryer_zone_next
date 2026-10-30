# Mehrigiyo — Bosh kuryer sayti

Viloyat bosh kuryerlari uchun alohida veb-sayt (2026-10-30).

**Bo'limlar:**
- **Zakazlar** — logistdan kelgan zakazlarni o'z kuryerlariga qo'lda yoki avto taqsimlash.
- **Kuryerlar** — jamoa: kuryer yaratish (login va parol bir marta), jamoaga olish yoki chiqarish.
- **Zonalar** — o'z viloyatidagi zonalar.
- **Kassa** — kuryerdan pul qabul qilish va bosh logistga topshirish.
- **Statistika** — kuryer bo'yicha manzil soni, yetkazildi, atkaz, haqi.

## Ishga tushirish

```bash
npm install
npm run dev
```

Sayt `https://localhost:3030` da ochiladi. Sukutda test server ishlatiladi (`config/servers.mjs`).

Kirish — bosh kuryer akkaunti bilan (logist saytidagi kabi login). Rolni bosh logist beradi:
logist sayti → «Kuryerlar → Bosh kuryerlar → Tayinlash» yoki «Logistlar → Yangi logist → Viloyat bosh kuryeri».
