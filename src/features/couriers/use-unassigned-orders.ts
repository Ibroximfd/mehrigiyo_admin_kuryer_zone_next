"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchOrders } from "@/features/orders/api";
import type { OrdersQuery } from "@/features/orders/api";
import type { LogistOrder } from "@/features/orders/types";
import { queryKeys } from "@/lib/query-keys";

/** Hudud bo'yicha server filtri: `?region=` · `?zone=<id>`/`none` · `?district=`. */
export type UnassignedArea = Pick<OrdersQuery, "regions" | "zones" | "districts">;

/**
 * Tasdiqlangan, kuryersiz buyurtmalar (100 tagacha) — hudud filtri
 * **serverda** (`?region=`, `?zone=<id>` / `?zone=none`, `?district=`,
 * qo'llanma §5). Kuryer `confirmed` da biriktiriladi — `shipping` ga o'tish
 * sharti (02 §2.3). Tuman yoki kuryer o'zgarsa `["orders"]` ildizi eskiradi
 * va ro'yxat o'zi yangilanadi.
 */
export function useUnassignedOrders(enabled: boolean, area: UnassignedArea = {}) {
  const query: OrdersQuery = {
    statuses: ["confirmed"],
    period: "all",
    pageSize: 100,
    // Bosh kuryerga ham berilmaganlar (backend 2026-10-30 §2, `?chief=none`).
    chief: "none",
    ...area,
  };
  return useQuery({
    queryKey: queryKeys.orders({ scope: "unassigned", ...query }),
    queryFn: ({ signal }) => fetchOrders(query, signal),
    enabled,
    select: (page): LogistOrder[] => page.orders.filter((order) => !order.courier),
  });
}
