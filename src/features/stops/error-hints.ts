import { errorCode } from "@/lib/api-client";

import { orderErrorMessage } from "@/features/orders/error-hints";

/**
 * To'xtash xatolari. Kodlarning ko'pi umumiy lug'atda (`orders/error-hints`);
 * bu yerda faqat to'xtash kontekstida boshqa ma'no beradiganlari:
 * `courier_required` — "yo'lga chiqarish" emas, birlashtirish uchun kuryer.
 */
const STOP_HINTS: Record<string, string> = {
  courier_required: "Birlashtirish uchun buyurtmalarga avval kuryer biriktiring",
  order_closed: "Buyurtmalardan biri yopilgan — faqat ochiq buyurtmalar birlashtiriladi",
  order_not_found: "Buyurtma topilmadi — ro'yxatni yangilang",
};

export function stopErrorMessage(error: unknown, fallback: string): string {
  const code = errorCode(error);
  return (code && STOP_HINTS[code]) || orderErrorMessage(error, fallback);
}
