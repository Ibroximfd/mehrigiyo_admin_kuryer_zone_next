# Backend javoblari — 4 (2026-10-17): jamoa chati · profil rasmi · fon ishlashi · ochiq savollar

Talablar: `HUDUD_BACKEND_TALABLAR_4.md`. ✅ — qilindi (develop + test server), ℹ️ — tushuntirish.
Migratsiyalar: `staff_chat 0003`, `operator 0051` — qo'shuvchi.

---

## 1. ✅ Logist ↔ kuryer jamoa chati

Siz taklif qilgandek: **yangi tizim emas**, mavjud `staff_chat` kengaytirildi. Kuryer o'z akkaunti bilan
(`role="courier"`) xuddi xodim kabi qatnashadi — shuning uchun o'qilgan kursor, fayllar, o'chirish ikki tomonda bitta.

**Kanal turlari:** `group`, `order` (mavjud) + **`team`** (umumiy guruh, BITTA — hamma filial) + **`direct`** (lichka).

### Logist tomoni (`/api/staff-chat/…`, mavjud token)
| Endpoint | Holat |
|---|---|
| `GET channels/?kind=team,direct` | ✅ vergul bilan ro'yxat; `team`/`direct` **xabarsiz ham** ko'rinadi (buyurtma kanallari avvalgidek faqat xabardan keyin) |
| `GET channels/team/` | ✅ umumiy guruh (yo'q bo'lsa yaratadi) |
| `GET channels/team/members/?search=` | ✅ logistlar/adminlar + akkaunti bor faol kuryerlar |
| `POST channels/direct/ {peer_kind, peer_id}` | ✅ idempotent (ikkinchi so'rov o'sha kanal) |
| `GET/POST channels/{id}/messages/`, `POST channels/{id}/read/`, `DELETE messages/{id}/` | ✅ `team`/`direct` uchun ham ishlaydi |

### Kuryer tomoni (`/api/courier/chat/…`, kuryer tokeni) — hammasi ✅
| Endpoint | Javob |
|---|---|
| `GET /api/courier/chat/channels/` | `[{id, kind, title, peer, unread_count, last_message{text,kind,by,at}, last_message_at}]` |
| `GET /api/courier/chat/team/members/?search=` | `[{id, kind, courier_id/operator_id, full_name, phone, avatar, role_label, online, last_seen_at, on_shift?, can_message}]` |
| `POST /api/courier/chat/direct/ {peer_kind:"staff", peer_id}` | kanal (idempotent); `peer_kind:"courier"` → `403 forbidden` |
| `GET …/channels/{id}/messages/?before=&limit=50` | `{results[], has_more, next}` — **eng yangisi pastda**, har xabarda `is_mine`, `sender{id, kind, full_name, avatar}` |
| `POST …/channels/{id}/messages/` | `{text?, reply_to?, client_action_id}` yoki multipart `file` — idempotent, cheklovlar logist bilan bir xil |
| `POST …/channels/{id}/read/ {last_message_id}` | `{ok, last_read_message_id}` |
| `GET /api/courier/chat/unread-count/` | `{total, team, direct}` |
| `DELETE /api/courier/chat/messages/{id}/` | `204`; begonasi → `403`, 24 soatdan keyin → `409 delete_window_closed` |

### WS
- Kuryerga (`/ws/courier/`): **`team_message`**, **`direct_message`** (`{channel_id, message}`),
  **`channel_read`** (`{channel_id, by{id,kind,full_name}, last_message_id}`), **`message_deleted`** (`{channel_id, message_id}`).
- Logistga (`/ws/operator/`): mavjud `staff_message` / `staff_badge` `team`/`direct` uchun ham + `staff_channel_read`.

### Push (FCM)
`courier_team_message` va `courier_direct_message`, `data: {type, channel_id, thread_key}` — `thread_key` bir kanalning
10 xabari 10 banner bo'lmasligi uchun. **Ikkalasi ham ovozli** (egasi sukut qarori) — guruhni ovozsiz qilish kerak
bo'lsa `utils/push_registry.py` da bitta qator.

### Qoidalar (test bilan qulflangan)
- Matn ≤ **4096**, `javascript:`/`data:text/html` → `400 {fields:{text:["Ruxsatsiz havola"]}}`; media cheklovlari logist bilan bir xil.
- O'chirilgan kuryer/xodim bilan lichkaga yozib bo'lmaydi → **`403 peer_inactive`** (arxiv o'qiladi).
- O'z xabarini 24 soat ichida o'chirish; begonasini yo'q.
- `online`/`last_seen_at`: kuryer — heartbeat'dan; xodim — hozircha `null` (panel WS holati bilan to'ldiradi).
- `@mention` yo'q (kelgusida).

### Savollar 21–23
21. ℹ️ **Kuryer ↔ kuryer lichka YO'Q** (sukut qoidasi). A'zolar ro'yxatida kuryer qatorida `can_message: false`,
    urinilsa `403`. Yoqish kerak bo'lsa — `staff_chat/team.ALLOWED_DIRECT` ga bitta juft qo'shish.
22. ℹ️ **Guruh BITTA** (hamma filial), `slug="team"`.
23. ℹ️ **Ovozli** (sukut). Ovozsizga o'tkazish — bitta sozlama.

---

## 2. ✅ Kuryer profil rasmi
- `POST /api/courier/me/avatar/` — multipart `file` (yoki `avatar`); faqat rasm (JPEG/PNG/WebP), ≤ 2 MB;
  xato: `415 unsupported_media`, `413 file_too_large`. `DELETE` — o'chiradi.
- Javob: `{"avatar": {url, thumb_url, updated_at}}`; nusxa (~400 px WebP) server yasaydi.
- `avatar` endi: kuryer `me/`/login, logist kuryerlar ro'yxati, **jonli xarita** (`couriers/live/`), chat `sender`
  va a'zolar ro'yxati. Rasm yo'q bo'lsa `null`.
- WS `courier_updated {courier_id, avatar}` → filial guruhiga (logist ro'yxati/xaritasi darhol almashtiradi).

## 3. ✅ Fon ishlashi
`device{}` da yangi: `battery_optimized`, `autostart_confirmed` — `POST /courier/location/` va `heartbeat` orqali
saqlanadi. `couriers/live/` dagi `alerts` ga qo'shildi: **`battery_restricted`** (`battery_optimized: true`),
**`autostart_off`** (`autostart_confirmed: false`). To'liq ro'yxat: `permission_denied`, `gps_off`,
`battery_restricted`, `autostart_off`, `app_killed`, `stale`, `mock_location`.

## 4. ℹ️ Buyurtma chati (kuryer ilovasi)
- WS hodisasi: **`message_created`** — `{type: "message_created", order_id, message, at}`. (`chat_message` YO'Q —
  ilova shu nomni kutsin.) O'qilgani: `order_messages_read {order_id, up_to_id}`.
- FCM: `data.type = "courier_chat_message"`, `data.order_id` bor, qo'shimcha `thread_key = "courier_chat_<order_id>"`.

## 5. ℹ️ Ochiq qolgan savollar
- **Logist PATCH manzil matni:** maydon nomi **`delivery_address_text`**. ⚠️ `address_text` qabul qilinMAYDI
  (`field_not_allowed`) — panel `delivery_address_text` yuborsin. Javobda `delivery.address_text` (umumiy blok) va
  kartada ham shu nom. Kuryer endpointida esa tana `address_text` (TALABLAR_3 §2 dagidek) — ikkalasi ataylab har xil,
  chunki ikki xil shartnoma.
- **`order.address_changed.payload.changed[]`** — aynan `address_text`, `locality`, `district`, `lat`, `lng`. Tasdiq.
