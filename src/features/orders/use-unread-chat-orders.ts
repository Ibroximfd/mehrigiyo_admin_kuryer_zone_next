"use client";

import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

import { queryKeys } from "@/lib/query-keys";

import { fetchOrderDetail } from "./api";
import type { LogistOrder } from "./types";

type DetailResult = { data?: { order: LogistOrder }; isPending: boolean };

/** Modul darajasida — barqaror havola, natija faqat so'rovlar o'zgarganda qayta yig'iladi. */
function combineOrders(results: DetailResult[]): {
  orders: LogistOrder[];
  isLoading: boolean;
} {
  return {
    orders: results
      .map((result) => result.data?.order ?? null)
      .filter((order): order is LogistOrder => order !== null),
    isLoading: results.some((result) => result.isPending),
  };
}

/** Bir yo'la ko'pi bilan shuncha buyurtma alohida so'raladi. */
const MAX_EXTRA = 30;

/**
 * "Yangi xabar" chipi — o'qilmagan muhokamasi bor buyurtmalar.
 *
 * Chip soni chegarasiz `unread-by-order/` dan keladi, doska esa ustunni
 * 20 qatorga qirqadi: muhokamasi bor buyurtma yuklanmagan qismda qolsa
 * chip "1" deb turib doska "topilmadi" derdi. Yuklanmagan buyurtmalar
 * shu yerda alohida (`orders/{id}/`) olinadi va yuklanganlarga qo'shiladi.
 */
export function useUnreadChatOrders({
  enabled,
  unreadIds,
  loaded,
}: {
  enabled: boolean;
  unreadIds: readonly string[];
  loaded: readonly LogistOrder[];
}): { orders: LogistOrder[]; isLoading: boolean } {
  const missing = useMemo(() => {
    if (!enabled) return [];
    const have = new Set(loaded.map((order) => order.id));
    return unreadIds.filter((id) => !have.has(id)).slice(0, MAX_EXTRA);
  }, [enabled, unreadIds, loaded]);

  return useQueries({
    queries: missing.map((id) => ({
      queryKey: queryKeys.orderDetail(id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchOrderDetail(id, signal),
      staleTime: 30_000,
      retry: false,
    })),
    combine: combineOrders,
  });
}
