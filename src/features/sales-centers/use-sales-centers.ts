"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAsInteger, useQueryState } from "nuqs";
import { useMemo } from "react";

import { queryKeys } from "@/lib/query-keys";

import { fetchSalesCenters } from "./api";
import { hasCenterChoice, salesFilialParam, type SalesCenter } from "./types";

/**
 * Markazlar — butun sayt uchun bitta kesh (kam o'zgaradi). `centers`:
 * `null` — hali kelmagan; xato bo'lsa bo'sh ro'yxat (filtr chiqmaydi,
 * sahifa markazsiz ishlayveradi).
 */
export function useSalesCenters(): { centers: SalesCenter[] | null; choice: boolean } {
  const query = useQuery({
    queryKey: queryKeys.chiefSalesCenters,
    queryFn: ({ signal }) => fetchSalesCenters(signal),
    staleTime: 10 * 60_000,
    retry: false,
  });
  const centers = query.isPending ? null : (query.data ?? []);
  return { centers, choice: hasCenterChoice(centers) };
}

/** URLdagi tanlov → `sales_filial` (yoki `null` — umumiy). */
export function useSalesFilialParam(selected: number | null): string | null {
  const { centers } = useSalesCenters();
  return useMemo(() => salesFilialParam(selected, centers), [selected, centers]);
}

/**
 * «Markaz» tanlovi URLda (`?center=3`) — havola ulashilsa ham o'sha markaz;
 * filtr xotirasi (`FilterMemory`) sahifa bo'yicha eslab qoladi. Sotuv
 * jadvali, Sklad va Reytinglar shu hookdan; Zakazlar — o'z filtrlari ichida.
 */
export function useCenterParam() {
  const [center, setCenter] = useQueryState("center", parseAsInteger);
  const salesFilial = useSalesFilialParam(center);
  return { center, setCenter: (id: number | null) => void setCenter(id), salesFilial };
}
