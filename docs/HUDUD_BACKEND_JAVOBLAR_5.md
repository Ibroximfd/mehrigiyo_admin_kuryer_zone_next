# Backend javoblari — 5 (2026-10-19)

Manba: flutterchidan kelgan 2 ta so'rov (TALABLAR_4 §6).
Holat: **BAJARILDI**, developda. ⚠️ Prodga chiqmagan.

---

## 1. "O'qildi" hodisasiga KIM o'qigani qo'shildi

### Nima noto'g'ri edi
Hodisa faqat `order_id` + `up_to_id` yuborardi. Kuryer ilovasi logist
o'qigani haqidagi hodisani ham "mening o'qilmaganlarim 0 bo'ldi" deb
tushunishi mumkin edi — hisoblagich noo'rin tushardi.

### Endi: IKKALA tomonda ham `by`

Har "o'qildi" amali **ikki manzilga** ketadi — o'quvchining qarshi
tomoniga **va o'z tomoniga** (ikkinchi qurilma / boshqa logist belgini
o'zi ham tushirishi kerak).

#### Kuryer soketi (`/ws/courier/`) — `messages_read`

```json
{
  "type": "messages_read",
  "order_id": "8525e093-e689-4253-8a37-d6e7db6c1003",
  "up_to_id": 142,
  "by": "logist",
  "by_id": 5,
  "by_name": "Nilufar",
  "unread": 1,
  "at": "2026-10-19T11:56:43+05:00"
}
```

#### Logist paneli (filial kanali) — `order_messages_read`

```json
{
  "type": "order_messages_read",
  "order_id": "8525e093-e689-4253-8a37-d6e7db6c1003",
  "up_to_id": 142,
  "by": "courier",
  "by_id": 12,
  "by_name": "Aziz Karimov",
  "unread": 0,
  "at": "2026-10-19T11:56:43+05:00"
}
```

### Maydonlar

| Maydon | Ma'no |
|---|---|
| `by` | `"courier"` yoki `"logist"` — **kim o'qidi** |
| `by_id` | o'quvchining `id` si (kuryer `id` si yoki operator `id` si) |
| `by_name` | o'quvchining to'liq ismi (ko'rsatish uchun) |
| `up_to_id` | shu `id` gacha (shu `id` ni ham qo'shib) o'qilgan; **butun son** |
| `unread` | hodisani **olgan tomonning** o'qilmaganlari soni |
| `at` | server vaqti (ISO, +05:00) |

### Ilovada qanday ishlatiladi

```
agar by == "courier" (va men kuryer bo'lsam) → bu MENING o'qishim
    (boshqa qurilmadan): badge = unread
agar by == "logist"  (va men kuryer bo'lsam) → logist MENING xabarlarimni
    o'qidi: faqat "✓✓" belgisini qo'y, badge'ga TEGMA (lekin xohlasang
    `unread` ni ishlatib sinxronlab ol — u har doim to'g'ri)
```

Logist panelida ayni shu, teskarisiga: `by == "logist"` → o'zimizning
o'qishimiz, `by == "courier"` → kuryer o'qidi, "✓✓" qo'yiladi.

**Eng ishonchli yo'l:** `by` ni umuman tekshirmay, badge'ni har doim
`unread` ga tenglashtirish — u hodisani olgan tomon uchun hisoblangan.

### Yana bir o'zgarish
Ilgari **kuryer o'zi o'qiganda hodisa faqat logistga** ketardi. Endi
kuryerning o'z soketiga ham ketadi — bir kuryer ikki qurilmada tursa,
ikkinchisida badge o'zi tushadi.

### Hodisa qachon YUBORILMAYDI
`marked == 0` bo'lsa (hammasi allaqachon o'qilgan) hech narsa
yuborilmaydi — bu avvalgidek qoldi.

---

## 2. Logist uchun "o'qildi" hodisasi shakli — TASDIQLANDI

Yuqoridagi `order_messages_read` — **aynan shu** shakl. Taxmin qilib
yozganlaringizdan farqi: `by`, `by_id`, `by_name`, `unread`, `at`
**qo'shildi**; `type`, `order_id`, `up_to_id` **o'zgarmadi**.

⚠️ `up_to_id` endi har doim **butun son** (ilgari ilovadan kelgan xom
qiymat uzatilardi — matn `"142"` bo'lishi ham mumkin edi).

HTTP javoblari o'zgarmadi:
- `POST /api/courier/orders/{id}/messages/read/` → `{"ok": true, "marked": N}`
- `POST /api/operator/logist/orders/{uuid}/messages/read/` → `{"ok": true, "marked": N}`

---

## 3. Eslatma: TALABLAR_4 §6 fayli kelmagan

Siz "docs/HUDUD_BACKEND_TALABLAR_4.md oxiriga qo'shdim (6-bo'lim)"
dedingiz, lekin mendagi ikki nusxada ham fayl **5-bo'limda tugaydi**.
Yuqoridagi ish xabardagi matn bo'yicha qilindi. Agar 6-bo'limda shu
ikkitasidan boshqa talab ham bo'lsa — faylni qayta yuboring.

---

## 4. Qulflangan testlar

`courier_app/tests_chat.py::KimOqidi` (3 test):
- kuryer o'qisa — logist paneli ham, kuryerning ikkinchi qurilmasi ham
  `by: "courier"` bilan xabar oladi;
- logist o'qisa — kuryerga `by: "logist"` va `unread` **tushmaydi**
  (asosiy nosozlik shu edi);
- `marked == 0` bo'lsa hodisa yuborilmaydi.
