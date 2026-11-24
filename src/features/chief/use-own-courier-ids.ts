"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { queryKeys } from "@/lib/query-keys";

import { fetchChiefCouriers } from "./api";

/**
 * Bosh kuryerning o'z kuryerlari id lari (kesh boshqa bo'limlar bilan umumiy).
 * `null` — ro'yxat hali kelmagan: «o'z kuryeri emas» degan xulosa chiqarilmaydi.
 */
export function useOwnCourierIds(): ReadonlySet<number> | null {
  const couriers = useQuery({ queryKey: queryKeys.chiefCouriers, queryFn: ({ signal }) => fetchChiefCouriers(signal) });
  return useMemo(() => (couriers.data ? new Set(couriers.data.map((courier) => courier.id)) : null), [couriers.data]);
}
