import type { OrderBoardColumn, OrdersBoard } from "./board";
import { insertByOrdering } from "./order-sort";
import type { PlaceableOrder } from "./order-sort";
import type { LogistOrder } from "./types";

/**
 * Buyurtmalar tartibi — **server** qo'llaydi (`?ordering=`, 2026-10-01 C §8).
 *
 * Mijoz javobni qayta saralamaydi: doska ustuni `?limit=` bilan server
 * tartibidan KEYIN qirqiladi, ya'ni mijozdagi saralash faqat yuklangan
 * 20 ta ichida ishlardi (§8.5). Bu modul faqat sahifalarni birlashtiradi va
 * real vaqtda kelgan bitta kartani tartibdagi o'rniga qo'yadi.
 */

/** `ordering` berilmagan so'rovlar uchun (CSV eksport va h.k.). */
export const DEFAULT_ORDERING = "-created_at";

/** Doska kesh kalitidagi filtrlardan o'sha so'rovga ketgan `ordering`. */
export function boardOrdering(filters: unknown): string {
  if (filters && typeof filters === "object" && "ordering" in filters) {
    const value = (filters as { ordering?: unknown }).ordering;
    if (typeof value === "string" && value) return value;
  }
  return DEFAULT_ORDERING;
}

/**
 * "Yana yuklash" sahifalarini bitta ro'yxatga yig'adi — server tartibida.
 *
 * Sahifalash offset bo'yicha: birinchi sahifadan keyin yangi buyurtma
 * tushsa, keyingi sahifa siljiydi va oldingi sahifaning oxirgi qatori
 * **ikkinchi marta** keladi. Id bo'yicha birinchi uchragani qoladi.
 */
export function mergeOrderPages<TOrder extends { id: string }>(
  pages: ReadonlyArray<{ orders: readonly TOrder[] }>,
): TOrder[] {
  const seen = new Set<string>();
  const merged: TOrder[] = [];
  for (const page of pages) {
    for (const order of page.orders) {
      if (seen.has(order.id)) continue;
      seen.add(order.id);
      merged.push(order);
    }
  }
  return merged;
}

/**
 * Real vaqtda kelgan yangi buyurtmani doskaga qo'yadi: o'z ustunining
 * `ordering` bo'yicha o'rniga, hisoblagich va summa bilan.
 *
 * `null` — qo'shib bo'lmadi: bunday ustun yo'q yoki karta allaqachon
 * doskada (soketning takroriy hodisasi). Chaqiruvchi doskani serverdan oladi.
 */
export function insertOrderInBoard<TOrder extends LogistOrder & PlaceableOrder>(
  board: OrdersBoard<TOrder>,
  order: TOrder,
  ordering: string,
): OrdersBoard<TOrder> | null {
  const target = board.columns.find((column) => column.status === order.status);
  if (!target) return null;
  const exists = board.columns.some((column) =>
    column.orders.some((item) => item.id === order.id),
  );
  if (exists) return null;

  return {
    ...board,
    columns: board.columns.map((column): OrderBoardColumn<TOrder> =>
      column.status === order.status
        ? {
            ...column,
            orders: insertByOrdering(
              column.orders,
              { ...order, statusDisplay: column.label },
              ordering,
              column.orders.length < column.count,
            ),
            count: column.count + 1,
            // Ustun summasi — to'lanadigan summa (`moveOrderInBoard` bilan bir xil).
            totalAmount:
              column.totalAmount === null ? null : column.totalAmount + order.payableAmount,
          }
        : column,
    ),
  };
}
