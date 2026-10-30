import { isOpenChangeRequest } from "@/features/orders/change-request";
import { isCashPayment } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";

const OPEN = new Set(["confirmed", "shipping"]);

/** Onlayn to'lov "jonli" deb hisoblanadigan to'lov holatlari (provayder kutmoqda). */
const LIVE_PAYMENT_STATUSES = new Set(["processing", "waiting", "created", "in_progress"]);

type BusyFacts = Pick<
  LogistOrder,
  "changeRequest" | "paymentMethod" | "paymentStatus" | "pendingReason" | "isPaid" | "paidAt"
>;

/**
 * Band buyurtma (`LOGIST_03` §0, v2): kuryerning ochiq o'zgarish so'rovi
 * bor yoki onlayn to'lovi jonli — to'xtashga KIRMAYDI (server
 * `400 order_busy`). Yakuniy hukm serverniki; bu yerda faqat tanlovni
 * oldindan qulflash va sababini aytish.
 *
 * Qaytaradi: band bo'lish sababi yoki `null`.
 */
export function orderBusyReason(order: BusyFacts): string | null {
  if (isOpenChangeRequest(order.changeRequest)) {
    return "kuryerning o'zgarish so'rovi javob kutmoqda";
  }
  if (order.pendingReason === "awaiting_online_payment") {
    return "onlayn to'lov kutilmoqda";
  }
  const method = (order.paymentMethod ?? "").trim().toLowerCase();
  const status = (order.paymentStatus ?? "").trim().toLowerCase();
  if (
    method &&
    !isCashPayment(method) &&
    LIVE_PAYMENT_STATUSES.has(status) &&
    order.isPaid !== true &&
    order.paidAt === null
  ) {
    return "onlayn to'lov jarayonda";
  }
  return null;
}

/**
 * Tanlangan buyurtmalarni bitta to'xtashga birlashtirish mumkinmi —
 * serverdagi qoidaning (`LOGIST_03` §0) mijozdagi nusxasi, faqat tugmani
 * oldindan tushuntirish uchun. Kun va manzilni yakuniy server tekshiradi
 * (`different_date|different_address`, manzil ≤ 50 m).
 *
 * Qaytaradi: to'sqinlik sababi yoki `null` (ruxsat).
 */
export function stopMergeBlocker(
  orders: ReadonlyArray<
    Pick<LogistOrder, "status" | "courier" | "stopId" | "orderNumber"> & BusyFacts
  >,
): string | null {
  if (orders.length < 2) return "Bir manzilga birlashtirish uchun kamida ikkita buyurtma tanlang";
  if (orders.some((order) => !OPEN.has(order.status))) {
    return "Faqat ochiq buyurtmalar birlashtiriladi";
  }
  if (orders.some((order) => order.stopId !== null)) {
    return "Buyurtmalardan biri allaqachon boshqa manzilda";
  }
  for (const order of orders) {
    const reason = orderBusyReason(order);
    if (reason) return `#${order.orderNumber} band — ${reason}`;
  }
  const couriers = new Set(orders.map((order) => order.courier?.id ?? null));
  if (couriers.has(null)) return "Birlashtirish uchun buyurtmalarga avval kuryer biriktiring";
  if (couriers.size > 1) return "Buyurtmalar bitta kuryerda bo'lishi kerak";
  return null;
}
