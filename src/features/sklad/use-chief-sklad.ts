"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { fetchChiefSklad } from "./api";

/**
 * Bosh kuryer skladi: o'z ombori, kuryerlari qoldig'i va yozish huquqi.
 * Sklad sahifasi va Sotuv jadvali (kuryerga berish / qabul / tuzatish) bitta
 * keshdan o'qiydi. `enabled: false` — so'ralmaydi (sklad dopuski yo'q yoki
 * jadval bugun emas).
 */
export function useChiefSklad(enabled = true) {
  return useQuery({
    queryKey: queryKeys.chiefSklad,
    queryFn: ({ signal }) => fetchChiefSklad(signal),
    enabled,
  });
}
