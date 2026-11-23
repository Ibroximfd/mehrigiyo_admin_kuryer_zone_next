"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";

import { todayIso } from "@/lib/format";
import { LIVE_REFETCH_MS } from "@/lib/live-refetch";
import { queryKeys } from "@/lib/query-keys";

import { fetchSkladSheet, skladSheetParams } from "./api";
import type { SkladSheetQuery } from "./api";
import { resolveDay } from "./period";

/**
 * Sklad jadvali. Oldingi javob vaqtinchalik (`placeholderData`) ushlab
 * turiladi, lekin ekranda chizilmaydi: kun holati ham, kunlik harakat ham
 * sanaga bog'liq (`DayStockSlot`, `QueryStateView`) — eski raqam yangi sana
 * nomi bilan ko'rinmasin.
 */
export function useSkladSheet(query: SkladSheetQuery, live = false) {
  return useQuery({
    queryKey: queryKeys.chiefSkladSheet(skladSheetParams(query)),
    queryFn: ({ signal }) => fetchSkladSheet(query, signal),
    placeholderData: (previous) => previous,
    // Bugun — jonli (egasi, 2026-11-20): soket hodisasi kelmasa ham eskirmasin.
    refetchInterval: live ? LIVE_REFETCH_MS : false,
  });
}

const PARSERS = { day: parseAsString };

/**
 * Kun URLda (`?day=`) — havola ulashilsa ayni kun ochiladi. Sukut (bugun) URLga
 * yozilmaydi: ertasi kuni sahifa o'zi yangi kunni ochadi.
 */
export function useSkladSheetPeriod() {
  const [state, setState] = useQueryStates(PARSERS);
  const today = todayIso();

  return {
    today,
    day: resolveDay(state.day, today),
    setDay: (day: string) => void setState({ day: day >= today ? null : day }),
  };
}

export type SkladSheetPeriod = ReturnType<typeof useSkladSheetPeriod>;
