import { cancelReasonLabel } from "./reasons";
import {
  ORDER_STATUSES,
  PAYMENT_METHOD_FILTERS,
  isCashPayment,
  isClientConfirmation,
} from "./types";
import type { LogistOrder, OrderStatus } from "./types";

/**
 * Boshqaruv (dashboard) hisoblari — doska ma'lumotidan (`05` §7).
 *
 * Doska har ustunda cheklangan sonni yuklaydi (`BOARD_LIMIT`), shuning uchun
 * bu yig'indilar **yuklangan** buyurtmalar bo'yicha; ustun to'liq
 * yuklanmagan bo'lsa ekran buni ochiq aytadi. Sof funksiyalar — test qilinadi.
 */

export type StatusCounts = Record<OrderStatus, number>;

/**
 * Taqsimot qatori — bitta to'lov turi bo'yicha status sonlari. Logist faqat
 * o'z filiali ichida ishlaydi (backend hammasini filial bo'yicha cheklaydi),
 * shuning uchun kesim filial emas, to'lov turi × status.
 */
export type BreakdownRow = {
  key: string;
  label: string;
  counts: StatusCounts;
  /** `confirmed` va kuryer biriktirilmagan — jo'natishni kutayotganlar. */
  noCourier: number;
  /** Bekor qilinganlarsiz to'lanadigan summa. */
  amount: number;
};

export const OTHER_PAYMENT_KEY = "other";
export const NO_PAYMENT_KEY = "none";
const OTHER_PAYMENT_LABEL = "Boshqa";
const NO_PAYMENT_LABEL = "Ko'rsatilmagan";

/** Qatorlar tartibi: filtr chiplari tartibida, keyin "boshqa", oxirida "yo'q". */
const PAYMENT_ROW_ORDER: string[] = [
  ...PAYMENT_METHOD_FILTERS.map((item) => item.value),
  OTHER_PAYMENT_KEY,
  NO_PAYMENT_KEY,
];

function emptyCounts(): StatusCounts {
  return Object.fromEntries(
    ORDER_STATUSES.map((status) => [status.value, 0]),
  ) as StatusCounts;
}

function isKnownStatus(status: string): status is OrderStatus {
  return ORDER_STATUSES.some((item) => item.value === status);
}

/**
 * To'lov turi → qator. Guruhlash filtr chiplari bilan bir xil (`cash` va
 * `manual` — bitta "Naqd"), shuning uchun jadval va filtr bir tilda gapiradi.
 */
function paymentRowOf(
  method: string | null,
  provider: string | null = null,
): [string, string] {
  const key = (method ?? "").trim().toLowerCase();
  const prov = (provider ?? "").trim().toLowerCase();
  if (!key && !prov) return [NO_PAYMENT_KEY, NO_PAYMENT_LABEL];
  // `02` §2.2: yangi usullar — cash | click | payme. Eski `card` yozuvlari
  // provayder kalitidan (`click_merchant`, `payme_merchant`) ajratiladi.
  if (key === "click" || prov.startsWith("click")) return ["click", "Click"];
  if (key === "payme" || prov.startsWith("payme")) return ["payme", "Payme"];
  if (isCashPayment(key)) return ["cash", "Naqd"];
  const filter = PAYMENT_METHOD_FILTERS.find((item) =>
    (item.methods as readonly string[]).includes(key),
  );
  if (filter) return [filter.value, filter.label];
  if (key === "karta") return ["card", "Karta"];
  return [OTHER_PAYMENT_KEY, OTHER_PAYMENT_LABEL];
}

type BreakdownOrder = Pick<
  LogistOrder,
  "status" | "paymentMethod" | "paymentProvider" | "courier" | "payableAmount"
>;

export function groupOrdersByPayment(orders: BreakdownOrder[]): BreakdownRow[] {
  const rows = new Map<string, BreakdownRow>();

  for (const order of orders) {
    const [key, label] = paymentRowOf(order.paymentMethod, order.paymentProvider ?? null);
    const row = rows.get(key) ?? {
      key,
      label,
      counts: emptyCounts(),
      noCourier: 0,
      amount: 0,
    };

    if (isKnownStatus(order.status)) row.counts[order.status] += 1;
    if (order.status === "confirmed" && order.courier === null) row.noCourier += 1;
    if (order.status !== "cancelled") row.amount += order.payableAmount;
    rows.set(key, row);
  }

  return [...rows.values()].sort(
    (a, b) => PAYMENT_ROW_ORDER.indexOf(a.key) - PAYMENT_ROW_ORDER.indexOf(b.key),
  );
}

/** "Jami" qatori — ustunlar bo'yicha yig'indi. */
export function totalBreakdownRow(
  rows: BreakdownRow[],
): Omit<BreakdownRow, "key" | "label"> {
  const counts = emptyCounts();
  let noCourier = 0;
  let amount = 0;
  for (const row of rows) {
    for (const status of ORDER_STATUSES) counts[status.value] += row.counts[status.value];
    noCourier += row.noCourier;
    amount += row.amount;
  }
  return { counts, noCourier, amount };
}

// ─────────────────────────────────────────────────────────────────────────────
// Oqim vaqtlari
// ─────────────────────────────────────────────────────────────────────────────

export type FlowTimings = {
  /** Tasdiq → jo'natish, daqiqa; ma'lumot bo'lmasa `null`. */
  confirmToShipMinutes: number | null;
  /** Jo'natish → yetkazish, daqiqa. */
  shipToDeliverMinutes: number | null;
  /** Tasdiqlanganlar ichida mijoz o'zi tasdiqlaganlar ulushi, 0..1. */
  clientConfirmShare: number | null;
};

type TimedOrder = Pick<
  LogistOrder,
  "confirmedAt" | "shippedAt" | "deliveredAt" | "confirmation"
>;

function averageMinutes(pairs: Array<[Date | null, Date | null]>): number | null {
  const spans = pairs
    .filter((pair): pair is [Date, Date] => pair[0] !== null && pair[1] !== null)
    .map(([from, to]) => (to.getTime() - from.getTime()) / 60_000)
    .filter((minutes) => minutes >= 0);
  if (spans.length === 0) return null;
  return Math.round(spans.reduce((sum, value) => sum + value, 0) / spans.length);
}

export function flowTimings(orders: TimedOrder[]): FlowTimings {
  const confirmed = orders.filter((order) => order.confirmation?.channel);
  const byClient = confirmed.filter((order) =>
    isClientConfirmation(order.confirmation?.channel),
  );

  return {
    confirmToShipMinutes: averageMinutes(
      orders.map((order) => [order.confirmedAt ?? order.confirmation?.confirmedAt ?? null, order.shippedAt]),
    ),
    shipToDeliverMinutes: averageMinutes(
      orders.map((order) => [order.shippedAt, order.deliveredAt]),
    ),
    clientConfirmShare: confirmed.length ? byClient.length / confirmed.length : null,
  };
}

/** `220` → "3 s 40 d"; `null` → "—". */
export function formatSpan(minutes: number | null): string {
  if (minutes === null) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} d`;
  return `${hours} s ${rest} d`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Atkaz sabablari
// ─────────────────────────────────────────────────────────────────────────────

/** Eng ko'p uchragan sabablar: "2 · Javob bermadi, 1 · Manzil xato". */
export function cancelReasonBreakdown(
  orders: Array<Pick<LogistOrder, "status" | "cancel">>,
  limit = 2,
): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const order of orders) {
    if (order.status !== "cancelled") continue;
    const label = cancelReasonLabel(order.cancel?.reason) || "Sababsiz";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}
