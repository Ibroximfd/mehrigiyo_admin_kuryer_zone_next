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

type Reassignable = { status: string; courier: Pick<CourierRef, "id" | "isVirtual"> | null };

/**
 * Zakaz haqiqiy kuryersiz yopilganmi: kuryer yo'q, server `is_virtual: true` bergan
 * yoki (server belgini hali bermasa) o'rin bosh kuryerning o'z kuryerlari ro'yxatida
 * yo'q — bu uning yashirin o'rni. Backend javobi (2026-11-24): prodda «kuryersiz»
 * blokdagi zakazlarning hammasida aynan shu yashirin o'rin turibdi.
 * `ownCourierIds: null` — ro'yxat hali kelmagan: xulosa chiqarilmaydi.
 */
export function isClosedWithoutRealCourier(
  courier: Reassignable["courier"],
  ownCourierIds: ReadonlySet<number> | null,
): boolean {
  if (courier === null || courier.isVirtual === true) return true;
  return ownCourierIds !== null && !ownCourierIds.has(courier.id);
}

/**
 * «Kuryerni biriktirish» chiqadimi: zakaz yetkazilgan va haqiqiy kuryeri yo'q.
 * Haqiqiy kuryerda yopilgan zakazda tugma yo'q; adashib chiqsa ham yakuniy so'z
 * serverda (`409 delivered_courier_locked`).
 */
export function canAttachAfterDelivery(order: Reassignable, ownCourierIds: ReadonlySet<number> | null = null): boolean {
  return order.status === "delivered" && isClosedWithoutRealCourier(order.courier, ownCourierIds);
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
