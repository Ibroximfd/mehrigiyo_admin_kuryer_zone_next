import { attemptReasonLabel, deliveryDateTone, localDateKey } from "./types";
import type { LogistOrder } from "./types";

/**
 * Kartochka va ro'yxatdagi kichik hisoblar — sof funksiyalar (pulga
 * tegmaydi): kechikish kunlari, urinishlar qatori.
 */

/** Yetkazish sanasi o'tgan faol buyurtma necha kun kechikkan; bo'lmasa `0`. */
export function overdueDays(
  order: Pick<LogistOrder, "status" | "deliveryDate" | "deliveryScheduledAt">,
  now: Date = new Date(),
): number {
  const key = order.deliveryDate ?? order.deliveryScheduledAt;
  if (!key) return 0;
  if (order.status === "delivered" || order.status === "cancelled") return 0;
  if (order.deliveryDate && deliveryDateTone(order, now) !== "overdue") return 0;
  const today = new Date(`${localDateKey(now)}T00:00:00`);
  const due = new Date(`${key}T00:00:00`);
  const days = Math.round((today.getTime() - due.getTime()) / 86_400_000);
  return days > 0 ? days : 0;
}

/** "1 · mijoz uyda yo'q" — urinishlar soni va oxirgi sababi. */
export function attemptsSummary(order: Pick<LogistOrder, "deliveryAttempts">): string {
  const attempts = order.deliveryAttempts;
  if (attempts.length === 0) return "0";
  const last = attempts[attempts.length - 1];
  const reason = last ? attemptReasonLabel(last.reason).toLowerCase() : "";
  return reason ? `${attempts.length} · ${reason}` : String(attempts.length);
}

/** Tarkib qisqa: "Rayhon krem ×2 · 1 quti". */
export function itemsSummary(
  order: Pick<LogistOrder, "items" | "itemCount" | "boxCount">,
): string {
  const lines = order.items.map((item) => `${item.name} ×${item.quantity}`);
  const head = lines.length > 2 ? `${lines.slice(0, 2).join(", ")} +${lines.length - 2}` : lines.join(", ");
  const box = order.boxCount ? `${order.boxCount} quti` : "";
  const text = [head || (order.itemCount ? `${order.itemCount} dona` : ""), box]
    .filter(Boolean)
    .join(" · ");
  return text || "—";
}
