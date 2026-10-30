# Backend uchun talablar — 4 (2026-10-17): jamoa chati · profil rasmi · fon ishlashi · ochiq qolganlar

Bu fayl — hozirgi holatda **backend qilishi kerak bo'lgan hamma narsa** bitta joyda. Avvalgi fayllardan
(`TALABLAR_3` §1–7) qilingani bu yerda yo'q; faqat ochiq qolganlari va yangilari.
Ustuvorlik: 🔴 kerak · 🟡 foydali. Ilovalar shu shartnomaga yozilmoqda, kelmagan maydonlarda null-safe.

---

## 1. 🔴 Logist ↔ kuryer jamoa chati (YANGI, egasi qarori)

Buyurtma chatlaridan **alohida**, Telegram'dagidek:
- **Umumiy guruh** — barcha logistlar va barcha kuryerlar bitta guruhda ("Logistlar va kuryerlar").
- **Shaxsiy chat (lichka)** — bitta logist ↔ bitta kuryer (logist ↔ logist va kuryer ↔ kuryer ham ruxsat —
  egasi qarori kerak, sukut: **faqat logist ↔ kuryer va logist ↔ logist**; kuryer ↔ kuryer YO'Q).
- Lichkaga o'tish: guruh a'zolari ro'yxatini ochib, odamga bosib "Xabar yozish" → chat ochiladi (yoki mavjudi).

### Taklif: mavjud `staff-chat` ni kengaytirish (yangi tizim emas)
Logist panelida `/api/staff-chat/` bor (`channels`, `group`, `order` turlari, `messages`, `read`, `unread-count`,
WS `/ws/operator/`). Kuryerlarni shu tizimga **ishtirokchi** sifatida qo'shish eng arzon va yagona yo'l.

**Kanal turlari:** `group` (mavjud, xodimlar ichki) · `order` (mavjud) · **`team`** (yangi — logist+kuryer umumiy
guruh, bitta, avtomatik) · **`direct`** (yangi — ikki kishi).

**Logist tomoni (`/api/staff-chat/…`, mavjud token):**
| Endpoint | |
|---|---|
| `GET channels/?kind=team,direct` | ro'yxatda yangi turlar ham; `direct` da `peer{id, kind: "courier"\|"staff", full_name, avatar, online, last_seen_at}` |
| `GET channels/team/` | umumiy guruh (yo'q bo'lsa yaratadi) |
| `GET channels/team/members/?search=` | a'zolar: logistlar + **faol** kuryerlar; `{id, kind, full_name, phone, avatar, role_label, online, last_seen_at, on_shift?}` |
| `POST channels/direct/ {peer_kind: "courier"\|"staff", peer_id}` | lichka ochadi yoki mavjudini qaytaradi (idempotent) → kanal |
| `GET/POST channels/{id}/messages/`, `POST channels/{id}/read/`, `DELETE messages/{id}/` | mavjud — `team`/`direct` uchun ham |

**Kuryer tomoni (yangi, `/api/courier/chat/…`, kuryer tokeni):**
| Endpoint | |
|---|---|
| `GET /api/courier/chat/channels/` | kuryer ko'radigan kanallar: `team` + o'zining `direct` lari; har birida `unread_count`, `last_message{text, kind, by, at}`, `peer{…}` (direct) |
| `GET /api/courier/chat/team/members/?search=` | logistlar (+ kuryerlar — faqat ko'rish uchun; kuryer ↔ kuryer lichka ruxsat etilmasa `can_message: false`) |
| `POST /api/courier/chat/direct/ {peer_kind: "staff", peer_id}` | logist bilan lichka ochadi/qaytaradi |
| `GET /api/courier/chat/channels/{id}/messages/?before=&limit=50` | sahifalash (eng yangisi pastda), `is_mine`, `sender{id, kind, full_name, avatar}` |
| `POST /api/courier/chat/channels/{id}/messages/` | `{text?, reply_to?, client_action_id}` yoki multipart (rasm/fayl/ovoz — buyurtma chatidagi bilan bir xil cheklovlar), idempotent |
| `POST /api/courier/chat/channels/{id}/read/ {last_message_id}` | o'qildi |
| `GET /api/courier/chat/unread-count/` | `{total, team, direct}` |
| `DELETE /api/courier/chat/messages/{id}/` | o'z xabarini o'chirish (24 soat ichida) → `204`; ilova shu yo'lni kutadi |

**WS:**
- Kuryerga (`/ws/courier/`): `team_message {channel_id, message}`, `direct_message {channel_id, message}`,
  `channel_read {channel_id, by, last_message_id}` (o'qildi belgisi), `message_deleted`.
- Logistga (`/ws/operator/`): mavjud staff-chat hodisalari `team`/`direct` uchun ham.

**Push (FCM):** kuryerga `team_message` (guruh — sukut **o'chiq** emas, lekin ovozsiz/"silent" — egasi qarori:
sukut ovozli) va `direct_message` (har doim ovozli), `data: {type, channel_id}` — bosilganda chat ochiladi.
Logistga brauzer bildirishnomasi mavjud mexanizm bilan.

**Qoidalar:**
- Matn ≤ 4096, `javascript:`/`data:text/html` rad (buyurtma chatidagidek). Media cheklovlari bir xil.
- O'chirilgan kuryer guruhdan chiqadi, lichka arxivda qoladi (yozib bo'lmaydi: `403 peer_inactive`).
- Xabarni o'chirish — faqat o'zinikini, 24 soat ichida; logist (admin) guruhda istalganini.
- `online`/`last_seen_at` — kuryer uchun heartbeat'dan, logist uchun panel WS'dan.
- Guruhda `@mention` hozircha yo'q (🟡 keyin).

- Xabarlar sahifalashi: javobda `has_more: bool` (yoki `next`) bo'lsin — ilova shunga qaraydi.

### Savollar
21. Kuryer ↔ kuryer lichka ruxsat etilsinmi? (Sukut: yo'q.)
22. Umumiy guruh bitta (hamma filial) yoki har filialga alohida? (Egasi: "opshi hamma" — bitta.)
23. Guruh push'i ovozli bo'lsinmi yoki ovozsiz?

---

## 2. 🔴 Kuryer profil rasmi
`TALABLAR_3` §8 — o'zgarishsiz. Kuryer ilovasi va logist xaritasi tayyor, faqat backend kutilmoqda:
`POST/DELETE /api/courier/me/avatar/`, `courier.avatar{url, thumb_url, updated_at}` hamma kuryer javoblarida,
WS `courier_updated {courier_id, avatar}`.

## 3. 🟡 Fon ishlashi (aldashga qarshi) — yangi `device{}` maydonlari
Kuryer ilovasi `POST /courier/location/` va `heartbeat` dagi `device{}` blokida endi qo'shimcha yuboradi:
`battery_optimized: bool` (true = Android batareya cheklovi YOQIQ — yomon), `autostart_confirmed: bool`.
So'raladi:
- Saqlash va `couriers/live/` dagi `alerts` ga qo'shish: `battery_restricted` (battery_optimized = true),
  `autostart_off` (autostart_confirmed = false). Logist xaritasida belgi bo'ladi.

## 4. 🟡 Kuryer ilovasida chat xabarlari (buyurtma chati)
Ilova ichida yangi xabar banneri qo'shildi. Tekshiring:
- WS `/ws/courier/` da buyurtma chatiga logist yozganda hodisa (nomi va shakli) aniq qaysi? Ilova
  `chat_message`/`message_created` ni kutadi — farq bo'lsa ayting.
- FCM `data.type` buyurtma chati uchun qaysi qiymat (`order_message`?) va `data.order_id` bormi.

## 5. Ochiq qolgan savollar (avvalgi fayllardan)
- Logist `PATCH /operator/logist/orders/{id}/` da manzil matni maydoni: panel `address_text` yuboradi;
  javobda `delivery_address_text` tilga olingan. `address_text` qabul qilinadimi — tasdiqlang.
- `order.address_changed.payload.changed[]` dagi maydon nomlari: `address_text`, `locality`, `district`, `lat`, `lng`
  deb kutilmoqda — tasdiqlang.

## 6. Qo'shimcha aniqliklar (2026-10-19, JAVOBLAR_4 dan keyin)
- **`order_messages_read {order_id, up_to_id}`** (kuryer WS) — payload'ga **`by: {kind: "staff"|"courier", id}`**
  qo'shilsin. Kim o'qiganini bilmasak, kuryer ilovasi o'qilmaganlar sonini nolga tushira olmaydi (logist o'qisa
  kuryer hisobi tushmasligi kerak).
- **`staff_channel_read`** (logist WS) — payload shakli: `{channel_id, by{id, kind, full_name}, last_message_id}` deb
  kutilmoqda (kuryerdagi `channel_read` bilan bir xil). `by.id` — operator id (xodim) yoki courier id (`kind` bilan
  ajratiladi) — tasdiqlang.

## 7. Ilova o'zgarishi (2026-10-19): Android joylashuv ruxsati
Play Store talablari uchun Android'da endi **"Ilova ishlatilayotganda"** ruxsati yetarli (fon xizmati ilova
ochiq paytda boshlanadi va fonda ham ishlaydi). Shuning uchun Android kuryerlarida
`device.location_permission = "while_in_use"` — **normal holat**. Iltimos, `permission_denied` /
"Doim emas" turidagi ogohlantirishni Android uchun `while_in_use` da BERMANG; faqat iOS'da `always` talab qilinadi
(`device.platform = "ios"` va `while_in_use` → ogohlantirish).
