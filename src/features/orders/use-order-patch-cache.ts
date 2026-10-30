"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { queryKeys } from "@/lib/query-keys";

import type { LogistOrder, LogistOrderDetail } from "./types";
import { markOrderSeen } from "./use-order-acks";

/**
 * PATCH natijasini keshga yozadi va bog'liq keshlarni eskirtiradi.
 *
 * Buyurtma darhol yangilanadi (qayta so'rovsiz), lekin detal **ham**
 * invalidate qilinadi: ilgari faqat `order` almashtirilib `audit[]` eski
 * qolardi — tarixda yangi o'zgarish ko'rinmasdi (05 §6 "stale audit" bugi).
 * Tarix lentasi, ro'yxat va doska ham yangilanadi.
 */
export function useOrderPatchCache(orderId: string) {
  const queryClient = useQueryClient();

  return useCallback(
    (updated: LogistOrder) => {
      markOrderSeen(orderId);
      queryClient.setQueryData<LogistOrderDetail>(
        queryKeys.orderDetail(orderId),
        (current) => ({ order: updated, audit: current?.audit ?? [] }),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.orderDetail(orderId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orderTimeline(orderId) });
      void queryClient.invalidateQueries({
        queryKey: ["orders"],
        predicate: (query) =>
          query.queryKey[1] !== "detail" && query.queryKey[1] !== "timeline",
      });
    },
    [queryClient, orderId],
  );
}
