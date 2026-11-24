import { isInReview } from "@/features/orders/review";
import type { LogistOrder, OrderItem } from "@/features/orders/types";
import { ROUTES } from "@/lib/routes";


/** Kartada nechta mahsulot nomi ko'rinadi; qolgani «+N». */
const VISIBLE_PRODUCTS = 2;

export type ProductsPreview = { shown: OrderItem[]; rest: number };

/**
 * Kartadagi qisqa mahsulotlar: nomli qatorlardan ikkitasi, qolgani «+N».
 * Chizish — `OrderProductsLine` (nom tarjima qilinmaydi, birlik qilinadi).
 */
export function productsPreview(order: Pick<LogistOrder, "items">): ProductsPreview {
  const items = order.items.filter((item) => item.name);
  const shown = items.slice(0, VISIBLE_PRODUCTS);
  return { shown, rest: items.length - shown.length };
}

/** Zakaz detali — «Zakazlar» sahifasida `?order=` bilan ochiladi (alohida sahifa yo'q, statik eksport). */
export function orderDetailHref(orderId: string): string {
  return `${ROUTES.orders}?order=${encodeURIComponent(orderId)}`;
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
  crm: "CRM",
};

/** «Manzil o'zgardi» belgisi uchun: kim o'zgartirgan; o'zgarmagan bo'lsa `null`. */
export function addressChangedBy(order: Pick<LogistOrder, "deliveryInfo">): string | null {
  const who = order.deliveryInfo?.addressChangedBy;
  return who ? (CHANGED_BY[who] ?? who) : null;
}

/** `ORD-20261114172926-893D459A` → `893D459A` (kuryer ilovasi ham shunday ko'rsatadi). */
export function shortOrderNumber(orderNumber: string): string {
  const tail = orderNumber.split("-").pop() ?? "";
  return tail.length >= 4 ? tail : orderNumber;
}
