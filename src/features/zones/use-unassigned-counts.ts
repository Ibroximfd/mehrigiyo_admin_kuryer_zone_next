"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { fetchUnassignedCounts } from "./api";

/**
 * Hudud filtri sonlari — serverdan (`unassigned-counts/`, backend A1).
 *
 * Kalit `["orders", {...}]` ildizida: biriktirishdan keyin panellar
 * `["orders"]` ni eskirtiradi, WS hodisalari (`order_courier_assigned`,
 * `order_auto_assigned`, kuryer olib tashlandi, status) esa
 * `orders/realtime.ts` dagi ro'yxat predikati orqali shu kalitni ham
 * yangilaydi — alohida ulanish kerak emas.
 */
export function useUnassignedCounts(enabled = true) {
  return useQuery({
    queryKey: queryKeys.orders({ scope: "unassigned-counts" }),
    queryFn: ({ signal }) => fetchUnassignedCounts(signal),
    enabled,
    staleTime: 15_000,
    retry: 1,
  });
}
