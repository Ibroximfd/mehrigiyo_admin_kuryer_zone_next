"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { QueryValue } from "@/lib/api-client";
import { errorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { fetchBaseBoard, fetchBaseColumnPage, fetchDeliveryBoard } from "./api";
import { appendColumnPage, columnHasMore, columnOffset, refetchLimit } from "./board-ops";
import type { PipelineBoard } from "./types";

export type PipelineStage = "delivery" | "base";

/**
 * Dostavka yoki Baza doskasi: birinchi sahifa (har ustunga 50 ta) va ustun
 * bo'yicha davom. Davom so'rovi keshga **qo'shiladi** — qayta so'rov
 * emas, ya'ni real vaqt yamoqlari va yuklangan sahifalar yo'qolmaydi.
 */
export function usePipelineBoard(
  stage: PipelineStage,
  filters: Record<string, QueryValue>,
) {
  const queryClient = useQueryClient();
  const key = useMemo(
    () =>
      stage === "delivery" ? queryKeys.deliveryBoard(filters) : queryKeys.baseBoard(filters),
    [stage, filters],
  );
  const fetcher = stage === "delivery" ? fetchDeliveryBoard : fetchBaseBoard;

  const query = useQuery({
    queryKey: key,
    // Ochilgan ustunlar qayta yuklashda qisqarmaydi (`refetchLimit`).
    queryFn: ({ signal }) =>
      fetcher(
        { filters, limit: refetchLimit(queryClient.getQueryData<PipelineBoard>(key)) },
        signal,
      ),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    // Qayta urinish — umumiy qoida (`providers.tsx`): 5xx/tarmoq 2 marta, 4xx yo'q;
    // so'rovning o'zi 30 s da uziladi — skeleton cheksiz aylanmaydi.
  });

  // Bir ustun bir vaqtda faqat bir marta davom ettiriladi.
  const [loadingColumns, setLoadingColumns] = useState<ReadonlySet<string>>(new Set());
  const inFlight = useRef(new Set<string>());

  const loadMore = useCallback(
    async (columnKey: string) => {
      const board = queryClient.getQueryData<PipelineBoard>(key);
      const column = board?.columns.find((item) => item.key === columnKey);
      if (!column || !columnHasMore(column) || inFlight.current.has(columnKey)) return;

      inFlight.current.add(columnKey);
      setLoadingColumns(new Set(inFlight.current));
      try {
        const params = { filters, offset: columnOffset(column) };
        // Bazada — faqat shu ustun; Dostavkada logist ustun endpointi yo'q.
        const page =
          stage === "base"
            ? await fetchBaseColumnPage(columnKey, params)
            : await fetcher(params);
        queryClient.setQueryData<PipelineBoard>(key, (current) =>
          current ? appendColumnPage(current, columnKey, page) : current,
        );
      } catch (error) {
        toast.error(errorMessage(error, "Davomini yuklashda xatolik"));
      } finally {
        inFlight.current.delete(columnKey);
        setLoadingColumns(new Set(inFlight.current));
      }
    },
    [queryClient, key, fetcher, filters, stage],
  );

  return {
    board: query.data ?? null,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isPlaceholder: query.isPlaceholderData,
    error: query.error,
    refetch: query.refetch,
    updatedAt: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
    loadMore,
    isLoadingColumn: (columnKey: string) => loadingColumns.has(columnKey),
  };
}
