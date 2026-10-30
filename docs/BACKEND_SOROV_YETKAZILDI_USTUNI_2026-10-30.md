# Backend'dan so'rov — Dostavkada «Yetkazildi» ustuni, 24 soatdan keyin Baza (2026-10-30)

**Egasi qarori:** lidning hamma zakazi yetkazilgach karta darhol yo'qolmasin. U Dostavkadagi
**«Yetkazildi»** ustuniga o'tib, u yerda **24 soat** turadi, keyin Bazaga o'tadi.
Ilgari «Yetkazildi ustuni yo'q, karta darhol Bazaga» edi — endi bu qoida bekor.

**Hozirgi holat:**
- Dostavka doskalari faqat 3 ustun qaytaradi: `pending`, `confirmed`, `shipping`.
- Yetkazilgan karta doskadan yo'qoladi. Hatto `handover_enabled` bo'limida ham shunday: u yerda lid
  24 soat `stage=delivery` da turadi (`lead.handover_at`), lekin hech bir ustunga kirmaydi.

**Frontend tayyor** (logist sayti va CRM):
- Doskaning oxirida doim «Yetkazildi» ustuni turadi.
- Server `delivered` ustunini bersa, karta shu ustunda chiqadi.
- Kartada «Bazaga 17 soat 20 daq» ko'rinadi (`handover_at` bo'yicha).
- Real vaqtda zakaz yetkazilsa, karta shu ustunga o'tadi.
- `lead_stage_changed` yoki `lead_handover` kelganda karta Bazaga o'tadi.

Quyidagilar backend'da kerak.

## 1. Doska javobida `delivered` ustuni 🔴

Uch endpointga tegishli:
- `GET /operator/logist/delivery/board/` (logist);
- `GET /operator/admin/delivery/board/` (CRM admin);
- `GET /operator/my-delivery/board/` (CRM sotuvchi).

Ular endi 4 ustun qaytarsin:

```json
{ "columns": [
  { "status": "pending",   "...": "..." },
  { "status": "confirmed", "...": "..." },
  { "status": "shipping",  "...": "..." },
  { "status": "delivered", "label": "Yetkazildi", "lead_count": 3, "leads": [ ... ] }
] }
```

**Ustunga qaysi lid kiradi:** `stage = delivery`, ochiq zakazi yo'q (`pending`, `confirmed`,
`shipping` qolmagan) va kamida bitta zakazi `delivered`. Ya'ni 24 soatlik kutishdagi lidlar.

**Tartib:** Bazaga eng tez o'tadigani birinchi (`handover_at` o'sish bo'yicha).

**Har kartada:**
- `handover_at` (ISO) — lid Bazaga o'tadigan payt. Lid darajasida yoki `delivery.handover_at` da bo'lsin.
- `delivery.column = "delivered"`.
- `delivery.orders[]` — oxirgi 24 soatda yetkazilgan zakazlar (holati, summasi, kuryeri bilan),
  eng yangisi birinchi. Bu ustunda ochiq zakaz bo'lmagani uchun karta shu ro'yxatni ko'rsatadi.

Mavjud filtrlar (`search`, `operator`, `unassigned=true`) va `total_leads` bu ustunga ham tegishli.
Ustunni davom ettirib yuklash (`?column=delivered&offset=`) ham boshqa ustunlar kabi ishlasin.

## 2. 24 soatlik kutish — hamma lid uchun 🔴

- **Hozir:** kutish faqat Pervichka bo'limida va `handover_enabled` yoqilgan bo'lsa ishlaydi.
- **Egasi talabi:** lid qaysi bo'limda bo'lsa ham, hamma zakazi yetkazilgach 24 soat Dostavkada
  («Yetkazildi») tursin, keyin `stage=base` ga o'tsin. Vaqt `handover_at` da yozilsin.
- **Kutish tugaganda:**
  - Pervichka + `handover_enabled` — avvalgidek egasidan uziladi va Baza-1 «Yangi» ustuniga tushadi.
    WS: `lead_handover`.
  - Qolgan lidlar — egasi o'zgarmaydi, Bazaning sukut ustuniga tushadi.
  - Har ikki holatda WS `lead_stage_changed {lead_id, from_stage: "delivery", to_stage: "base"}`
    kelsin: logist sayti va CRM shu hodisa bilan kartani Bazaga o'tkazadi.

## 3. Kutish bekor bo'ladigan holatlar 🔴

- 24 soat ichida `delivered → shipping` (qaytarish) bo'lsa — taymer bekor, karta zakaz ustuniga qaytadi.
  Bu avvalgidek, WS `order_status_changed` keladi.
- 24 soat ichida lidga **yangi zakaz** ochilsa — taymer bekor, karta yangi zakaz ustuniga o'tadi
  (`pending` yoki `confirmed`).

## 4. Savollar ❔

1. **Vaqt maydoni.** `handover_enabled` o'chiq bo'limda vaqt qaysi maydonda keladi? Taklif: o'sha
   `handover_at`. Frontend shuni o'qiydi.
2. **WS.** Kartani zakaz yetkazilishi bilan «Yetkazildi» ga o'tkazish uchun `order_status_changed`
   yetadi. Kartada `handover_at` ni darhol ko'rsatish uchun `lead_stage_changed` yoki alohida
   hodisada `handover_at` kelsin.
3. **24 soat.** Sozlanadigan bo'ladimi (`.env`)? Frontend vaqtni o'zi hisoblamaydi, faqat `handover_at` ni ko'rsatadi.
