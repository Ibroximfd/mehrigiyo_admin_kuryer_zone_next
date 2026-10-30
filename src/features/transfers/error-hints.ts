/**
 * Transfer xato kodlari → tushunarli matn (`BACKEND-LOGIST.md` §7).
 * Shoxlanish faqat kod bo'yicha; notanish kodda serverning o'z xabari.
 */

import { errorCode, errorMessage } from "@/lib/api-client";

const HINTS: Record<string, string> = {
  transfer_not_found: "Zakaz topilmadi — ro'yxatni yangilang",
  transfer_wrong_side: "Bu qadam sizning filialingizga tegishli emas",
  transfer_transition_forbidden:
    "Bu holat o'tishi tartibga zid — sahifani yangilab qayta ko'ring",
  transfer_self: "O'z filialingizga zakaz berib bo'lmaydi",
  transfer_empty_items: "Kamida bitta mahsulot tanlang",
  product_not_found: "Mahsulot topilmadi — qidiruvni qayta bajaring",
  reject_reason_required: "Rad etish uchun sabab yozish shart",
  endpoint_missing:
    "Filiallararo almashinuv uchun backend hali chiqmagan — tez orada",
};

export function transferErrorMessage(error: unknown, fallback: string): string {
  const code = errorCode(error);
  return (code && HINTS[code]) || errorMessage(error, fallback);
}
