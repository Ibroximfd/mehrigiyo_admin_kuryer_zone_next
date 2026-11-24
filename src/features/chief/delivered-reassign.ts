import type { CourierRef } from "@/features/orders/types";
import { errorCode, errorMessage } from "@/lib/api-client";

/**
 * Yetkazilgan zakazga kuryerni KEYIN biriktirish (hujjat 125 C, prodda 2026-11-24).
 * Zakaz kuryersiz yoki bosh kuryerning yashirin o'rnida yopilgan bo'lsa, bosh
 * kuryer uni o'z kuryeriga odatdagi `assign/` bilan biriktiradi — server skladni
 * (ombor → kuryer) va pulni shu kuryer qatoriga o'tkazadi, sana o'zgarmaydi.
 * Haqiqiy kuryerda yopilgan zakazni faqat logist o'zgartiradi
 * (`409 delivered_courier_locked`).
 */

type Reassignable = { status: string; courier: Pick<CourierRef, "isVirtual"> | null };

/**
 * «Kuryerni biriktirish» chiqadimi: zakaz yetkazilgan va haqiqiy kuryeri yo'q.
 * Yashirin o'rin faqat server `is_virtual: true` bersa tanib olinadi; bermasa
 * tugma chiqmaydi — yakuniy so'z baribir serverda.
 */
export function canAttachAfterDelivery(order: Reassignable): boolean {
  return order.status === "delivered" && (order.courier === null || order.courier.isVirtual === true);
}

const ERROR_TEXT: Readonly<Record<string, string>> = {
  delivered_courier_locked: "Kuryerni faqat logist o'zgartira oladi",
  edit_reason_required: "Kuryerni almashtirish uchun sabab kerak — bu zakazni logist o'zgartiradi",
  courier_not_found: "Kuryer topilmadi — ro'yxatni yangilang",
  courier_not_yours: "Bu kuryer sizning jamoangizda emas",
  courier_inactive: "Kuryer bloklangan — faol kuryerni tanlang",
};

/** Biriktirish xatosi — tushunarli matn; notanish kod — server matni. */
export function reassignErrorText(error: unknown, fallback: string): string {
  const code = errorCode(error);
  return (code && ERROR_TEXT[code]) || errorMessage(error, fallback);
}
