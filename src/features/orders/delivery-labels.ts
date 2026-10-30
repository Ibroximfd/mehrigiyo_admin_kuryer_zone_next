import { DELIVERY_WINDOWS } from "./types";
import type { DeliveryWindow, LogistOrder } from "./types";

/**
 * Yetkazish sanasi va oynasining matnlari — kartochka, ro'yxat va detal
 * bir xil yozadi: "29.09 · ertalab", "29.09.2026 · ertalab (09:00–13:00)".
 */

/** Oyna soatlari — kuryer marshruti shu bo'yicha tuziladi (dizayn). */
const WINDOW_HOURS: Record<DeliveryWindow, string> = {
  morning: "09:00–13:00",
  afternoon: "13:00–17:00",
  evening: "17:00–21:00",
};

/** Ro'yxat ustunidagi qisqa yozuv. */
const WINDOW_SHORT: Record<DeliveryWindow, string> = {
  morning: "ert.",
  afternoon: "kun.",
  evening: "kech.",
};

export function windowLabel(window: DeliveryWindow | null): string {
  if (!window) return "";
  return (DELIVERY_WINDOWS.find((item) => item.value === window)?.label ?? "").toLowerCase();
}

/** `YYYY-MM-DD` → "29.09" yoki "29.09.2026"; noto'g'ri qiymat — o'zi. */
export function formatDateKey(key: string, withYear = false): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return key;
  const [, year, month, day] = match;
  return withYear ? `${day}.${month}.${year}` : `${day}.${month}`;
}

type DeliveryFacts = Pick<LogistOrder, "deliveryDate" | "deliveryWindow">;

export function deliveryDateText(
  order: DeliveryFacts,
  { withYear = false, withHours = false, short = false } = {},
): string {
  if (!order.deliveryDate) return "";
  const date = formatDateKey(order.deliveryDate, withYear);
  const window = order.deliveryWindow;
  if (!window) return date;
  if (short) return `${date} ${WINDOW_SHORT[window]}`;
  const hours = withHours ? ` (${WINDOW_HOURS[window]})` : "";
  return `${date} · ${windowLabel(window)}${hours}`;
}
