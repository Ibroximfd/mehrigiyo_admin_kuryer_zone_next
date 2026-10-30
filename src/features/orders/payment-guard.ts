import { isCashPayment, paymentMethodLabel, paymentView } from "./types";
import type { LogistOrder } from "./types";

/**
 * Status o'tishi to'lovga tegmasligi shart (`00` 2-qaror, `02` §2.2:
 * `payment` statusdan mustaqil). Frontend PATCH tanasida pul kalitlari yo'q
 * (`withoutPaymentKeys`), ya'ni javobda usul o'zgargan bo'lsa — buni
 * **server** qilgan. Logist bilmay qolmasligi uchun farq aniqlanadi.
 *
 * Oldingi qiymat noma'lum (`null`) bo'lsa hukm chiqarilmaydi: backend
 * maydonni yubormagan bo'lishi mumkin, bu o'zgarish emas.
 */
export type PaymentDrift = { from: string; to: string };

type PaymentSide = Pick<LogistOrder, "paymentMethod">;

function methodKey(method: string | null): string {
  return (method ?? "").trim().toLowerCase();
}

/**
 * Yagona KUTILGAN istisno (2026-10-01 §5.2 / §9.3): mijoz Payme/Click ni
 * tanlab, to'lamay qaytgan buyurtma `pending` da qoladi. Logist uni
 * tasdiqlasa **server o'zi** usulni naqdga o'tkazadi (`cash` + `cod_pending`)
 * — pulni kuryer oladi. Pul allaqachon kelgan onlayn buyurtma va boshqa har
 * qanday o'tish (shipping, delivered, bekor, revert, tiklash) to'lovga
 * tegmaydi. Undo da usul onlaynga qaytmaydi.
 */
export function confirmSwitchesToCash(order: LogistOrder): boolean {
  if (order.status !== "pending") return false;
  const method = methodKey(order.paymentMethod);
  if (!method || isCashPayment(method)) return false;
  return paymentView(order).state !== "paid";
}

export function unexpectedPaymentChange(
  before: PaymentSide | null | undefined,
  after: PaymentSide,
): PaymentDrift | null {
  const from = methodKey(before?.paymentMethod ?? null);
  if (!from) return null;
  if (
    before &&
    "status" in before &&
    confirmSwitchesToCash(before as LogistOrder) &&
    (after as Partial<LogistOrder>).status === "confirmed" &&
    isCashPayment(after.paymentMethod)
  ) {
    return null;
  }
  const to = methodKey(after.paymentMethod);
  if (to === from) return null;
  return {
    from: paymentMethodLabel(before?.paymentMethod) || from,
    to: paymentMethodLabel(after.paymentMethod) || "yo'q",
  };
}

export function paymentDriftMessage(orderNumber: string, drift: PaymentDrift): string {
  return `${orderNumber}: status o'zgargach server to'lov usulini «${drift.from}» → «${drift.to}» qilib qo'ydi. Bu backend xatosi — tahrirdan usulni qaytaring.`;
}
