"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { fetchChiefRatings } from "./api";
import { ratingSearchParams } from "./types";
import type { RatingFilters } from "./types";

/** Filtrsiz 1-sahifa — kuryerlar sahifasidagi o'rtacha baho shu keshni bo'lishadi. */
export const NO_RATING_FILTERS: RatingFilters = {
  dateFrom: null,
  dateTo: null,
  stars: [],
  courierId: null,
  region: null,
  hasComment: null,
  page: 1,
};

/** Kalit — so'rov parametrlarining o'zi: bir xil filtr bir xil kesh. */
export function useChiefRatings(filters: RatingFilters, options: { enabled?: boolean; quiet?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.chiefRatings(ratingSearchParams(filters)),
    queryFn: ({ signal }) => fetchChiefRatings(filters, signal),
    // Sahifa almashganda jadval sakramaydi — eski sahifa yangisi kelguncha turadi.
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
    // Yordamchi ko'rinish (kuryerlar ro'yxati): backend hali chiqmagan/403 — jim, qayta urinmaydi.
    ...(options.quiet ? { retry: false } : {}),
  });
}
