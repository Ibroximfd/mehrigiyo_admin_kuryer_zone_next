# Manzil soni — qo'lda tuzatish (backend talabi, 2026-10-29)

Kuryer haqi va moliyadagi logistika **manzil soni** bo'yicha hisoblanadi:
1 manzilga bir borish = 1 to'lov (bitta manzildagi bir nechta buyurtma — bitta).
Manzil soni yetkazishdan avtomatik hisoblanadi (`LOGIST_03` §3: to'xtashsiz
yetkazilgan + alohida to'xtashlar). Endi logist xato bo'lsa uni **−1 / +1**
bilan tuzatadi.

## 1. Tuzatish — `POST /api/operator/logist/couriers/{courier_id}/address-adjustments/`

```json
{ "date": "2026-10-29", "delta": 1, "note": "" }
```

- `delta` — faqat `1` yoki `-1`. Har bosish — alohida yozuv (jurnal), eski yozuv o'chmaydi.
- `date` — o'sha kunning manzil soniga qo'shiladi (yetkazish kuni bo'yicha).
- Kuni bo'yicha jami (avto + qo'lda) **0 dan kam bo'lmaydi** → aks holda `409 {code: "addresses_negative"}`.
- Ruxsat: hamma logist (o'z filiali kuryerlari; asosiy logist — hamma). Boshqa → `403`.
- Javob: `200 {courier_id, date, auto, manual, total}`.
- WS: `courier_addresses_changed {courier_id, date, total}` — statistika va moliya yangilanadi.

## 2. Statistika — `GET /api/operator/logist/statistics/`

Mavjud `stops` endi **avto + qo'lda** jami. Qo'shimcha maydon:

- `totals.stops_manual` — davrdagi qo'lda tuzatishlar yig'indisi (±).
- `couriers[].stops_manual` — kuryer bo'yicha.
- `pay = stops × stavka` (qo'lda tuzatish ham kiradi).

Davrda yetkazgan, lekin manzili 0 bo'lgan kuryer ham `couriers[]` da kelsin (logist +1 qila olsin).

## 3. Moliya — `GET /api/sklad/finance/summary/` (hujjat 18 §7.2)

- Yangi maydon `addresses` — davrdagi manzil soni (avto + qo'lda).
- `logistics = logistics_per_order × addresses` (sozlama nomi o'zgarmaydi, ma'nosi — **har manzilga**).
- `by_day[]` va `by_filial[]` dagi `remaining` ham shu bilan.

## 4. UI (logist sayti, tayyor)

- Statistika › «Kuryer haqi»: har kuryer qatorida `−  N ta  +`, qo'lda tuzatilgan bo'lsa «qo'lda +1».
  Tugmalar faqat **bitta kun** tanlanganda (Bugun, Kecha, aniq sana) ishlaydi.
- Moliya › formula: «− Logistika · 70 000 × N» — N = manzil soni.
- Sozlamalar: «Logistika — har manzilga».
- Matnlarda «to'xtash soni» o'rniga «manzil soni».
