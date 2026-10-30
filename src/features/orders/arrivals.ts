import type { OrderBoardColumn } from "./board";
import type { LogistOrder } from "./types";

/**
 * Doskaga "hozirgina kelgan" buyurtmalar — sof qoidalar.
 *
 * Logist yangi buyurtmani faqat ovozdan emas, ko'zdan ham sezishi kerak:
 * karta ustun tepasiga silliq kirib keladi, ustun bir zum yonadi, ustun
 * pastga surilgan bo'lsa "N yangi buyurtma ↑" tabletkasi chiqadi.
 *
 * Kelish — ikki holat:
 *   • karta oldingi holatda doskaning **hech qayerida** yo'q edi (yangi
 *     buyurtma, uzilishdan keyin tushganlar);
 *   • karta boshqa ustundan ko'chib kirdi va hali hech kim olmagan
 *     ("YANGI") — masalan mijoz yoki operator tasdiqladi.
 *
 * Birinchi yuklash va filtr almashuvi kelish emas — oldingi holat `null`.
 */

/** Doskaning izi: orderId → ustun. */
export type BoardSnapshot = ReadonlyMap<string, string>;

export type Arrival = { id: string; status: string };

export function snapshotBoard(columns: readonly OrderBoardColumn<LogistOrder>[]): BoardSnapshot {
  const snapshot = new Map<string, string>();
  for (const column of columns) {
    for (const order of column.orders) snapshot.set(order.id, column.status);
  }
  return snapshot;
}

export function detectArrivals(
  previous: BoardSnapshot | null,
  columns: readonly OrderBoardColumn<LogistOrder>[],
  isFresh: (order: LogistOrder) => boolean,
): Arrival[] {
  if (previous === null) return [];
  const arrivals: Arrival[] = [];
  for (const column of columns) {
    for (const order of column.orders) {
      const before = previous.get(order.id);
      if (before === column.status) continue;
      if (before === undefined || isFresh(order)) {
        arrivals.push({ id: order.id, status: column.status });
      }
    }
  }
  return arrivals;
}

/** Ustundagi ko'rilmagan kelishlar — hali shu ustunda turganlari sanaladi. */
export function unseenInColumn(
  unseen: ReadonlySet<string>,
  column: OrderBoardColumn<LogistOrder>,
): number {
  if (unseen.size === 0) return 0;
  let count = 0;
  for (const order of column.orders) if (unseen.has(order.id)) count += 1;
  return count;
}
