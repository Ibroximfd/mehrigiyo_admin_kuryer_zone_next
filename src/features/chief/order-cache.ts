import type { QueryClient } from "@tanstack/react-query";

import type { LogistOrder } from "@/features/orders/types";
import { queryKeys } from "@/lib/query-keys";

import type { ChiefOrderDetail } from "./types";

/**
 * Manzil tuzatish / logistga qaytarishdan keyingi kesh. `chief/orders` ostida
 * ikki shakl turadi: sahifali ro'yxat (`useInfiniteQuery` — `{pages: [{orders,
 * count}]}`) va avto-taqsimlashning oddiy massivi (`LogistOrder[]`).
 */

type OrdersPage = { orders: LogistOrder[]; count: number; hasMore: boolean };

function isOrdersPage(value: unknown): value is OrdersPage {
  return typeof value === "object" && value !== null && Array.isArray((value as { orders?: unknown }).orders);
}

function isInfinite(value: unknown): value is { pages: unknown[]; pageParams: unknown[] } {
  return typeof value === "object" && value !== null && Array.isArray((value as { pages?: unknown }).pages);
}

function isOrderList(value: unknown): value is LogistOrder[] {
  return Array.isArray(value);
}

/** Ro'yxat keshidagi zakazni almashtiradi (`next`) yoki olib tashlaydi (`null`); shakl noma'lum bo'lsa tegmaydi. */
export function patchOrderInList(data: unknown, orderId: string, next: LogistOrder | null): unknown {
  const patchList = (orders: LogistOrder[]) =>
    next ? orders.map((order) => (order.id === orderId ? next : order)) : orders.filter((order) => order.id !== orderId);
  if (isOrderList(data)) return patchList(data);
  if (!isInfinite(data)) return data;
  const hadIt = data.pages.some((page) => isOrdersPage(page) && page.orders.some((order) => order.id === orderId));
  if (!hadIt) return data;
  return {
    ...data,
    pages: data.pages.map((page) => {
      if (!isOrdersPage(page)) return page;
      const removed = !next && page.orders.some((order) => order.id === orderId);
      return { ...page, orders: patchList(page.orders), count: removed ? Math.max(0, page.count - 1) : page.count };
    }),
  };
}

/** Shu zakaz detalidan boshqa hamma bosh kuryer so'rovlari (ro'yxatlar, `me` hisoblagichlari) yangilansin. */
function refreshAllExcept(queryClient: QueryClient, orderId: string): void {
  const detailKey = queryKeys.chiefOrderDetail(orderId);
  void queryClient.invalidateQueries({
    queryKey: queryKeys.chief,
    predicate: (query) => query.queryKey.length !== detailKey.length || query.queryKey.some((part, index) => part !== detailKey[index]),
  });
}

/** Manzil tuzatildi: javob — tayyor detal, kesh shu bilan yangilanadi (qayta so'rovsiz). */
export function storeOrderDetail(queryClient: QueryClient, detail: ChiefOrderDetail): void {
  const { order } = detail;
  queryClient.setQueryData(queryKeys.chiefOrderDetail(order.id), detail);
  queryClient.setQueriesData({ queryKey: queryKeys.chiefOrderLists }, (data: unknown) => patchOrderInList(data, order.id, order));
  refreshAllExcept(queryClient, order.id);
}

/** Logistga qaytarildi: zakaz bosh kuryer ro'yxatlaridan chiqadi, detali (endi `404`) keshdan o'chiriladi. */
export function dropOrder(queryClient: QueryClient, orderId: string): void {
  queryClient.removeQueries({ queryKey: queryKeys.chiefOrderDetail(orderId), exact: true });
  queryClient.setQueriesData({ queryKey: queryKeys.chiefOrderLists }, (data: unknown) => patchOrderInList(data, orderId, null));
  refreshAllExcept(queryClient, orderId);
}
