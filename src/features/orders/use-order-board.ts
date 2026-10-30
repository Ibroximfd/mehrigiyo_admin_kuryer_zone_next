"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { queryKeys } from "@/lib/query-keys";

import { moveOrderInBoard, patchOrderInBoard } from "./board";
import { boardOrdering } from "./ordering";
import { withReviewColumn } from "./review-board";
import type { OrderBoardColumn, OrdersBoard } from "./board";
import type { LogistOrder } from "./types";

/**
 * Doska ma'lumoti — chizuvchi komponent shu shakl bilan ishlaydi.
 *
 * Yuklash usuli backend holatiga qarab farq qiladi (board endpointi bitta
 * so'rov, zaxira — ustunma-ustun), lekin kesh, optimistik yangilash va
 * real vaqt yamog'i hammasida bitta.
 */
export type OrderBoardData = {
  columns: OrderBoardColumn<LogistOrder>[];
  /** Yuklab bo'lmagan ustunlar (backend `500`, 2026-10-01 C §15.2). */
  failedStatuses: string[];
  /** Barcha ustunlardagi kartochkalar — guruhlashni doska o'zi qiladi. */
  orders: LogistOrder[];
  isPending: boolean;
  isFetching: boolean;
  /**
   * Ko'rinayotgan ma'lumot boshqa filtrniki (`keepPreviousData`) — yangisi
   * hali kelmagan. "Hozirgina kelgan" kartalarni aniqlash shu paytda to'xtaydi.
   */
  isPlaceholder: boolean;
  /** Filtrlar izi — o'zgarsa doska "boshqa doska" (kelish emas). */
  filtersKey: string;
  error: unknown;
  updatedAt: number;
  refetch: () => void;
  /** Serverdan qayta olish — xatodan keyin holatni to'g'rilash uchun. */
  invalidate: () => void;
  /**
   * Optimistik ko'chirish: kartochka darhol yangi ustunda, hisoblagich va
   * summa ham birga siljiydi.
   */
  applyMove: (orderId: string, toStatus: string) => void;
  /**
   * Serverdan kelgan buyurtmani kartochkaga yozadi — PATCH javobi
   * optimistik nusxadan farq qilishi mumkin (masalan to'lov turi
   * `kutilmoqda` dan surilganda naqdga o'zgaradi).
   */
  applyOrder: (order: LogistOrder) => void;
};

export function useOrderBoard({
  filters,
  load,
  enabled = true,
}: {
  /** Barqaror obyekt bo'lishi kerak — u kesh kaliti. */
  filters: Record<string, unknown>;
  load: (signal: AbortSignal) => Promise<OrdersBoard<LogistOrder>>;
  enabled?: boolean;
}): OrderBoardData {
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => queryKeys.ordersBoard(filters), [filters]);
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => load(signal),
    enabled,
    // Filtr almashganda doska bo'shab qolmasin — eski natija turadi.
    placeholderData: keepPreviousData,
  });

  // Ko'rinadigan ustunlar: status ustunlari + «Jarayonda» (`review-board.ts`).
  const columns = useMemo(() => (query.data ? withReviewColumn(query.data) : []), [query.data]);
  const failedStatuses = useMemo(() => query.data?.failedStatuses ?? [], [query.data]);
  const orders = useMemo(
    () => columns.flatMap((column) => column.orders),
    [columns],
  );

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const applyMove = useCallback(
    (orderId: string, toStatus: string) => {
      /*
       * Karta darhol o'z o'rniga — doska tartibi qoidasi bilan (`-status_
       * changed_at` da ustun tepasiga). Statusga kirgan vaqt optimistik
       * "hozir"; server aks-sadosi (`status_changed_at`) uni almashtiradi.
       */
      const ordering = boardOrdering(filters);
      queryClient.setQueryData<OrdersBoard<LogistOrder>>(queryKey, (board) =>
        board ? (moveOrderInBoard(board, orderId, toStatus, { ordering }) ?? board) : board,
      );
    },
    [queryClient, queryKey, filters],
  );

  const applyOrder = useCallback(
    (order: LogistOrder) => {
      queryClient.setQueryData<OrdersBoard<LogistOrder>>(queryKey, (board) =>
        board ? (patchOrderInBoard(board, order) ?? board) : board,
      );
    },
    [queryClient, queryKey],
  );

  const { refetch } = query;

  return {
    columns,
    failedStatuses,
    orders,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isPlaceholder: query.isPlaceholderData,
    filtersKey,
    error: query.isError ? query.error : null,
    updatedAt: query.dataUpdatedAt,
    refetch: useCallback(() => void refetch(), [refetch]),
    invalidate,
    applyMove,
    applyOrder,
  };
}
