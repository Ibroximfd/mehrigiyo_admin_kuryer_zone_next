/**
 * Backend xato kodlarini tushunarli matnga o'giradi.
 *
 * Shoxlanish **kodga** qarab bo'ladi: matn o'zgarishi mumkin, kod — yo'q.
 * Kod tanish bo'lmasa serverning o'z xabari ko'rsatiladi.
 * Kodlar ro'yxati: `BACKEND-LOGIST.md` §5 (yig'ma jadval).
 */

import {
  ApiError,
  errorCode,
  errorFieldsRaw,
  errorMessage,
} from "@/lib/api-client";

import { changeFieldLabel } from "./types";

const HINTS: Record<string, string> = {
  // ── Rol va ruxsat (§1) ───────────────────────────────────────────────────
  role_forbidden: "Bu amalga sizning rolingiz haqli emas",
  status_transition_forbidden:
    "Bu o'tish logistga ruxsat etilmagan (02 §2.3) — ro'yxatni yangilang, status boshqa joydan o'zgargan bo'lishi mumkin",
  /* Eski `status_change_forbidden` kodi ham keladi (02 §9) — bir xil matn. */
  status_change_forbidden:
    "Bu o'tish logistga ruxsat etilmagan (02 §2.3) — ro'yxatni yangilang, status boshqa joydan o'zgargan bo'lishi mumkin",
  status_deprecated:
    "Bu status endi ishlatilmaydi — sahifani yangilang, 5 bosqichli oqim qo'llanadi",
  invalid_transition: "Buyurtma allaqachon boshqa holatda — sahifani yangilang",

  // ── Status sabablari (02 §2.5) ───────────────────────────────────────────
  cancel_reason_required: "Bekor qilish uchun sabab tanlash shart",
  revert_reason_required: "Orqaga qaytarish uchun sabab tanlash shart",
  // Logist tasdig'i (2026-10-01 §5.1) — oq ro'yxat operatornikidan boshqa.
  confirm_reason_required: "Tasdiqlash uchun ro'yxatdan sabab tanlash shart",
  confirm_note_required: "\"Boshqa sabab\" tanlansa izoh yozish shart",
  edit_window_closed:
    "Tahrir oynasi yopilgan — bu bosqichda faqat logist o'zgartiradi",

  // ── Mijoz ilovasi (§7.4) ─────────────────────────────────────────────────
  client_offline:
    "Mijozda ilova ulanmagan — oddiy telefon orqali qo'ng'iroq qiling",

  // ── Pul qorovullari (`FLUTTER_ORDER_PIPELINE_V2` §7.5) ───────────────────
  // Qayta urinish ham rad etiladi — matn "nima qilish kerak" ni aytadi.
  cancel_note_required: "\"Boshqa sabab\" tanlansa izoh yozish shart",
  cancelled_order_restore_forbidden:
    "Bu bekor qilingan buyurtmada keshbek, ball yoki sovg'a izi bor — uni tiklab bo'lmaydi. Yangi buyurtma yarating",
  paid_order_amount_locked:
    "Buyurtma onlayn to'langan — tarkib va summani o'zgartirib bo'lmaydi. Izoh va manzilni tahrirlash mumkin",
  online_payment_in_progress:
    "Mijoz onlayn to'lovni boshlagan — to'lov usulini naqdga o'tkazib bo'lmaydi (pul ikki marta yechilmasin)",
  order_cancelled: "Buyurtma bekor qilingan — avval uni tiklang",
  order_delivered: "Buyurtma allaqachon yetkazilgan",
  no_editable_field: "O'zgartiriladigan maydon yo'q — hech narsa saqlanmadi",
  invalid_delivery_date: "Yetkazish sanasi noto'g'ri",
  invalid_phone: "Telefon raqam noto'g'ri",
  invalid_quantity: "Mahsulot soni noto'g'ri",
  items_required: "Tarkibda kamida bitta mahsulot bo'lsin",
  too_many_items: "Tarkibda mahsulot juda ko'p",
  product_not_found: "Mahsulot topilmadi — katalogni yangilang",
  product_inactive: "Mahsulot sotuvdan olingan",
  price_increase_forbidden: "Narxni oshirish taqiqlangan",
  invalid_tags: "Teg noto'g'ri",
  invalid_status: "Status qiymati noto'g'ri — sahifani yangilang",
  no_filial: "Akkauntingiz filialga biriktirilmagan — administratorga murojaat qiling",
  permission_denied: "Bu amalga ruxsatingiz yo'q",
  not_found: "Topilmadi — ro'yxatni yangilang (boshqa filialga tegishli bo'lishi mumkin)",

  // ── Buyurtma (§3) ────────────────────────────────────────────────────────
  order_not_found: "Buyurtma topilmadi — ro'yxatni yangilang",
  order_not_finalized:
    "Zakaz hali yakunlanmagan — manzil soni yakunlashda yoziladi",
  courier_addresses_invalid: "Manzil soni 0 dan 9 gacha bo'lishi kerak",
  field_not_allowed: "Bu maydonni logist o'zgartira olmaydi",
  // Komissiya egasi (2026-10-01 §5.5).
  operator_required:
    "Buyurtma operator tavsiyasi orqali kelgan — tarkibni o'zgartirish uchun komissiya egasini tanlang",
  operator_invalid:
    "Bu operator filialingizning faol sotuvchisi emas — ro'yxatdan boshqasini tanlang",
  courier_required:
    "Yetkazishga chiqarish uchun avval kuryer biriktirish kerak",
  order_locked_by_transfer:
    "Buyurtma boshqa filialga o'tkazilmoqda — javob kelguncha qulflangan",

  // ── Kuryer (§4) ──────────────────────────────────────────────────────────
  courier_not_found: "Kuryer topilmadi — ro'yxatni yangilang",
  courier_inactive: "Bu kuryer faol emas — avval faollashtiring",
  // `courier_other_filial` 2026-10-15 dan yo'q — kuryer istalgan filialdan.

  // ── Zonalar va avto-taqsimlash (2026-10-15) ──────────────────────────────
  forbidden: "Bu amal sizga ruxsat etilmagan — admin panel orqali bajariladi",
  // Qo'llashda yagona kod (backend #15): muddat o'tgan ham, o'zgargan ham.
  plan_stale: "Reja eskirdi — buyurtmalar o'zgargan, reja qayta tuziladi",

  // ── Yetkazish urinishi (§5.3) ────────────────────────────────────────────
  attempt_wrong_status:
    "\"Yetkazib bo'lmadi\" faqat yetkazilayotgan buyurtmada belgilanadi",

  // ── Izohlar (§4.10) va COD hisobi (§4.6) ─────────────────────────────────
  comment_text_required: "Izoh matni bo'sh — nimadir yozing",
  already_settled: "Bu kun uchun pul allaqachon topshirilgan deb belgilangan",

  // ── Dostavka xatolari (2026-10-27, `LOGIST_02`–`04`) ─────────────────────
  // Naqd pul kassaga qabul qilingan — qaytarish/tahrir emas, pul qaytarish.
  cash_already_settled:
    "Naqd pul kassaga topshirilgan — buyurtmani qaytarib bo'lmaydi, pul qaytarishni rasmiylashtiring",
  edit_reason_required:
    "Yetkazilgan buyurtmani o'zgartirish sababi yozilishi shart",
  change_request_closed: "So'rov allaqachon yopilgan — ro'yxatni yangilang",
  change_request_not_found: "So'rov topilmadi — ro'yxatni yangilang",
  order_closed: "Buyurtma yopilgan — so'rovni qabul qilib bo'lmaydi",
  // To'xtashlar (`LOGIST_03` §2).
  stop_needs_two: "Bir manzilga birlashtirish uchun kamida ikkita buyurtma tanlang",
  different_courier: "Buyurtmalar bitta kuryerda bo'lishi kerak",
  different_date: "Buyurtmalarning yetkazish kuni bir xil bo'lishi kerak",
  different_address: "Buyurtmalarning manzili bir xil bo'lishi kerak",
  already_in_stop: "Buyurtmalardan biri allaqachon boshqa manzilda",
  // v2: ochiq o'zgarish so'rovi yoki jonli onlayn to'lov — to'xtashga kirmaydi.
  order_busy:
    "Buyurtmalardan biri band (kuryerning o'zgarish so'rovi yoki onlayn to'lov kutilmoqda) — uni chiqarib, qolganlarini birlashtiring",
  stop_not_found: "Manzil topilmadi — ro'yxatni yangilang",
  main_filial_only: "Stavkani faqat bosh filial logisti belgilaydi",

  // ── Backend hali chiqarmagan yo'l ────────────────────────────────────────
  endpoint_missing:
    "Bu amal uchun backend hali chiqmagan — logist endpointlari kutilmoqda",

  // ── Buyurtmani filialga o'tkazish (§8) ───────────────────────────────────
  order_transfer_pending: "Bu buyurtma bo'yicha o'tkazish so'rovi allaqachon bor",
  order_transfer_not_found: "O'tkazish so'rovi topilmadi — ro'yxatni yangilang",
  transfer_wrong_side: "Bu qadam sizning filialingizga tegishli emas",
  order_status_not_transferable:
    "Faqat tasdiqlangan buyurtma boshqa filialga o'tkaziladi",
  reject_reason_required: "Rad etish uchun sabab yozish shart",
  transfer_not_found: "O'tkazish topilmadi — ro'yxatni yangilang",
};

/**
 * `status_transition_forbidden` logist PATCH yo'lida **400** bilan keladi va
 * u "status qiymati noma'lum" degani (`fields.from/to`, `role` yo'q); **403**
 * esa o'tish matritsasi taqiqi (§7.2). Bir xil satr — ikki sabab.
 */
const UNKNOWN_STATUS_VALUE =
  "Server bu status qiymatini tanimadi — sahifani yangilang (statuslar ro'yxati o'zgargan bo'lishi mumkin)";

/** Xatoni logistga ko'rsatiladigan matnga aylantiradi. */
export function orderErrorMessage(error: unknown, fallback: string): string {
  const code = errorCode(error);
  if (
    code === "status_transition_forbidden" &&
    error instanceof ApiError &&
    error.status === 400
  ) {
    return UNKNOWN_STATUS_VALUE;
  }
  if (code === "field_not_allowed") return fieldNotAllowedMessage(error);
  return (code && HINTS[code]) || errorMessage(error, fallback);
}

/**
 * `field_not_allowed` — qaysi maydon rad etilgani ko'rinsin: `fields`
 * lug'atidagi nomlar yorliq bilan; `fields` yo'q bo'lsa (noma'lum maydon)
 * serverning `detail` matni (nomlar o'sha yerda).
 */
function fieldNotAllowedMessage(error: unknown): string {
  const base = HINTS.field_not_allowed!;
  const labels = [...new Set(Object.keys(errorFieldsRaw(error)).map(changeFieldLabel))];
  if (labels.length > 0) return `${base}: ${labels.join(", ")}`;
  const detail = errorMessage(error, "").trim();
  return detail && detail !== base ? `${base} — ${detail}` : base;
}

/** Pulni himoya qiluvchi rad javobi — umumiy "xatolik" emas, alohida ogohlantirish. */
const MONEY_GUARD_CODES = new Set([
  "paid_order_amount_locked",
  "online_payment_in_progress",
  "cancelled_order_restore_forbidden",
  "cash_already_settled",
]);

export function isMoneyGuardError(error: unknown): boolean {
  const code = errorCode(error);
  return code !== null && MONEY_GUARD_CODES.has(code);
}

/**
 * Yalang'och kod uchun matn — ommaviy amaldagi qisman xatolar (§4.5.1)
 * `{id, code}` ko'rinishida keladi, ya'ni `Error` obyekti yo'q.
 */
export function orderCodeMessage(code: string): string {
  return HINTS[code] ?? code;
}
