/**
 * Kuryerga yoziladigan manzil soni — logist buyurtmani yakunlaganda
 * (`shipping → delivered | cancelled`, 2026-10-29).
 *
 * Sukut: yetkazildi — `+1`, atkaz — `0` (kuryer mehnati hisoblanmaydi).
 * Logist ikkalasini ham o'zgartiradi: chatdan vaziyatni aniqlab, atkazga
 * ham `+N` beradi yoki yetkazildini «qo'shilmasin» (`0`) qiladi.
 *
 * Buyurtma birlashtirilgan **manzilda** (`stopId`) bo'lsa sukut `0`:
 * manzil bitta hisoblanadi va uning `+1` i manzil yopilganda yoziladi —
 * aks holda bitta eshik uchun kuryer ikki marta haq olardi.
 */
export const ADDRESS_CREDIT_MAX = 9;

export type FinalStatus = "delivered" | "cancelled";

export function defaultAddressCredit(
  to: FinalStatus,
  order: { stopId: number | null },
): number {
  if (order.stopId !== null) return 0;
  return to === "delivered" ? 1 : 0;
}

export function clampAddressCredit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(ADDRESS_CREDIT_MAX, Math.max(0, Math.round(value)));
}

/** Kuryer biriktirilmagan buyurtmada manzil yozilmaydi — maydon chizilmaydi. */
export function canCreditAddresses(order: { courier: unknown }): boolean {
  return order.courier !== null;
}
