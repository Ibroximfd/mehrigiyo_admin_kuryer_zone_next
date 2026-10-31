import { isInReview } from "@/features/orders/review";
import type { LogistOrder } from "@/features/orders/types";


/** Kartada nechta mahsulot nomi ko'rinadi; qolgani «+N». */
const VISIBLE_PRODUCTS = 2;

/** «Gepatofit × 2, Kardiomed × 1 +2» — kartadagi qisqa mahsulotlar qatori. */
export function orderProductsLine(order: Pick<LogistOrder, "items">): string {
  const items = order.items.filter((item) => item.name);
  if (items.length === 0) return "";
  const shown = items.slice(0, VISIBLE_PRODUCTS).map((item) => `${item.name} × ${item.quantity}`);
  const rest = items.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} +${rest}` : shown.join(", ");
}

/** Zakaz qayta taqsimlanadimi: yo'lda va kuryer hali yakunlamagan. */
export function isOpenOrder(order: LogistOrder): boolean {
  return order.status === "shipping" && !isInReview(order);
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Naqd",
  card: "Karta",
  click: "Click",
  payme: "Payme",
};

export function paymentLabel(method: string | null): string {
  if (!method) return "—";
  return PAYMENT_LABELS[method] ?? method;
}

const CHANGED_BY: Record<string, string> = {
  courier: "kuryer",
  logist: "logist",
  client: "mijoz",
  chief: "bosh kuryer",
};

/** «Manzil o'zgardi» belgisi uchun: kim o'zgartirgan; o'zgarmagan bo'lsa `null`. */
export function addressChangedBy(order: Pick<LogistOrder, "deliveryInfo">): string | null {
  const who = order.deliveryInfo?.addressChangedBy;
  return who ? (CHANGED_BY[who] ?? who) : null;
}
