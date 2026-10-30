import type { LogistOrder, OrderAck } from "./types";

/**
 * "Yangi" buyurtma va "Oldim" belgisi — sof qoidalar.
 *
 * Asosiy manba — server (`acknowledged_by`, 2026-10-01 §5.3, filial bo'yicha
 * umumiy: bitta logist "Oldim" bossa, qolganlari ham ko'radi; WS
 * `order_acknowledged`). Massiv kelsa — faqat server, mahalliy belgi
 * hisobga olinmaydi. Backend maydonni yubormasa (`null`) — **zaxira**: shu
 * qurilmadagi, logist akkaunti bo'yicha belgi (`stores/ack-store.ts`).
 *
 * "Tizim" yozuvi (`is_system`) — migratsiya deploydan oldingi har ochiq
 * buyurtmaga qo'ygan belgi: buyurtma "yangi" EMAS, lekin "Oldi: Tizim"
 * deb chizilmaydi — uni hech kim ishga olmagan.
 *
 * Zaxirada logist panelni birinchi ochgan paytdan (`baselineAt`) oldin
 * kelgan buyurtmalar "yangi" hisoblanmaydi — aks holda birinchi kuni butun
 * doska "YANGI" bo'lib yonardi.
 */

/** Yangi bo'lib ko'rinadigan bosqichlar: logist ishi hali boshlanmagan. */
const FRESH_STATUSES = new Set(["pending", "confirmed"]);

/** "Ko'rilmagan o'zgarish" uchun sezgirlik — o'z PATCH imizning aks-sadosi yutilsin. */
export const UNSEEN_GRACE_MS = 5_000;

export type LocalAckState = {
  /** Shu akkaunt shu qurilmada panelni birinchi ochgan payt (ms); yo'q — `null`. */
  baselineAt: number | null;
  /** orderId → "Oldim" bosilgan payt (ms). */
  acks: Readonly<Record<string, number>>;
  /** orderId → logist buyurtmani oxirgi marta ko'rgan/o'zgartirgan payt (ms). */
  seen: Readonly<Record<string, number>>;
};

export const EMPTY_LOCAL_ACKS: LocalAckState = { baselineAt: null, acks: {}, seen: {} };

type AckOrder = Pick<
  LogistOrder,
  "id" | "status" | "acknowledgedBy" | "createdAt" | "confirmedAt" | "updatedAt"
>;

/** Buyurtma logist doskasiga qachon "kelgan": tasdiqlangan payt, bo'lmasa yaratilgan. */
export function orderArrivedAt(order: AckOrder): Date | null {
  return order.confirmedAt ?? order.createdAt;
}

/** Server yubormagan bo'lsa — zaxira rejimi. */
export function isAckFallback(order: Pick<LogistOrder, "acknowledgedBy">): boolean {
  return order.acknowledgedBy === null;
}

/**
 * Buyurtmani kim olgani. Server rejimida — serverniki; zaxirada — faqat
 * joriy logistning o'z belgisi ("Siz").
 */
export function orderAcks(
  order: AckOrder,
  userId: string | null,
  local: LocalAckState,
): OrderAck[] {
  if (order.acknowledgedBy !== null) {
    return order.acknowledgedBy.filter((ack) => !ack.isSystem);
  }
  const at = local.acks[order.id];
  if (at === undefined) return [];
  return [{ userId, name: "Siz", at: new Date(at), isSystem: false }];
}

/** Joriy logistning o'z belgisi (vaqti bilan) yoki `null`. */
export function myAckAt(
  order: AckOrder,
  userId: string | null,
  local: LocalAckState,
): number | null {
  const localAt = local.acks[order.id];
  if (order.acknowledgedBy !== null) {
    if (userId === null) return null;
    const mine = order.acknowledgedBy.find((ack) => !ack.isSystem && ack.userId === userId);
    if (!mine) return null;
    return mine.at?.getTime() ?? localAt ?? 0;
  }
  return localAt ?? null;
}

/**
 * Hali hech kim olmagan yangi buyurtma — kartada ajralib turadi.
 *
 * Server rejimida filial bo'yicha: kimdir olgan bo'lsa hammada oddiy
 * ko'rinishga qaytadi. Zaxirada — joriy logist bo'yicha.
 */
export function isFreshOrder(
  order: AckOrder,
  userId: string | null,
  local: LocalAckState,
): boolean {
  if (!FRESH_STATUSES.has(order.status)) return false;
  if (order.acknowledgedBy !== null) return order.acknowledgedBy.length === 0;

  if (local.acks[order.id] !== undefined) return false;
  const arrived = orderArrivedAt(order);
  if (arrived === null || local.baselineAt === null) return false;
  return arrived.getTime() > local.baselineAt;
}

/**
 * Logist olgan buyurtma keyin boshqa joyda o'zgarganmi (nuqta belgisi).
 * Taqqoslash — logist uni oxirgi ko'rgan/o'zgartirgan payt bilan.
 */
export function hasUnseenChanges(
  order: AckOrder,
  userId: string | null,
  local: LocalAckState,
): boolean {
  const ackAt = myAckAt(order, userId, local);
  if (ackAt === null || order.updatedAt === null) return false;
  const seenAt = Math.max(ackAt, local.seen[order.id] ?? 0);
  return order.updatedAt.getTime() > seenAt + UNSEEN_GRACE_MS;
}

export function countFresh(
  orders: AckOrder[],
  userId: string | null,
  local: LocalAckState,
): number {
  let count = 0;
  for (const order of orders) if (isFreshOrder(order, userId, local)) count += 1;
  return count;
}
