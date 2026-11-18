"use client";

import { useQuery } from "@tanstack/react-query";

import type { SheetRange } from "@/features/sales-sheet/period";
import { queryKeys } from "@/lib/query-keys";

import { fetchCashSheet } from "./api";

/**
 * Kassa jadvali (hujjat 85 §3). Oldingi davr javobi yangi sana ostida
 * ushlab turilmaydi: pul jadvalida eski raqam yangi kun nomi bilan ko'rinmasin.
 */
export function useCashSheet(range: SheetRange) {
  return useQuery({
    queryKey: queryKeys.chiefCashSheet({ date_from: range.dateFrom, date_to: range.dateTo }),
    queryFn: ({ signal }) => fetchCashSheet(range, signal),
  });
}
