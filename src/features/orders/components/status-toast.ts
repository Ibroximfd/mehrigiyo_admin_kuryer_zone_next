import { toast } from "sonner";

import { paymentDriftMessage, unexpectedPaymentChange } from "@/features/orders/payment-guard";
import { undoPatch } from "@/features/orders/permissions";
import type { UndoPatch } from "@/features/orders/permissions";
import type { LogistOrder } from "@/features/orders/types";

/** Adashgan o'tish shu muddat ichida bir bosishda qaytariladi (§14 undo). */
export const UNDO_MS = 5000;

/**
 * Status o'zgarganidan keyingi toast — 5 soniyalik "Qaytarish" bilan.
 *
 * Doska, detal va sabab oynalari uchun bitta: teskari o'tish matritsada
 * bo'lmasa tugma chiqmaydi; sabab talab qilsa `undoPatch` uni o'zi
 * to'ldiradi (`revert_reason=mistake`), logist ikkinchi marta sabab yozmaydi.
 */
export function toastStatusChanged({
  order,
  before,
  fromStatus,
  description,
  onUndo,
}: {
  order: LogistOrder;
  /** Ikkinchi qator — masalan kim tasdiqlagani. */
  description?: string;
  /** O'tishdan oldingi buyurtma — to'lov usuli o'zgarmaganini tekshirish uchun. */
  before?: LogistOrder | null;
  fromStatus: string;
  onUndo: (patch: UndoPatch) => void;
}) {
  warnIfPaymentChanged(before, order);
  const patch = undoPatch(fromStatus, order.status);

  toast.success(`${order.orderNumber} · ${order.statusDisplay || "status o'zgardi"}`, {
    description: description || undefined,
    ...(patch
      ? { duration: UNDO_MS, action: { label: "⤺ Qaytarish", onClick: () => onUndo(patch) } }
      : {}),
  });
}

/**
 * Status o'tishidan keyin to'lov usuli o'zgargan bo'lsa (server qilgan —
 * frontend pul kalitini yubormaydi) logist darhol ko'rsin.
 */
export function warnIfPaymentChanged(
  before: LogistOrder | null | undefined,
  after: LogistOrder,
) {
  const drift = unexpectedPaymentChange(before, after);
  if (drift) toast.warning(paymentDriftMessage(after.orderNumber, drift), { duration: 15_000 });
}
