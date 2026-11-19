"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { fetchChiefCouriers } from "@/features/chief/api";
import { regionLabel } from "@/features/orders/regions";
import { queryKeys } from "@/lib/query-keys";

import { groupSheetByRegion, needsCourierRegions } from "./regions";
import type { RegionGroup } from "./regions";
import type { SalesSheet } from "./types";

/**
 * Jadval viloyatlar kesimida. Kuryerlar ro'yxati (`chief/couriers/`) faqat
 * server viloyatni bermaganda so'raladi — kesh boshqa bo'limlar bilan umumiy.
 * Ro'yxat yuklanguncha yoki yiqilsa — `null`: jadval guruhsiz, avvalgidek.
 */
export function useSheetRegions(sheet: SalesSheet | undefined): RegionGroup[] | null {
  const needsList = useMemo(() => sheet !== undefined && needsCourierRegions(sheet), [sheet]);
  const couriers = useQuery({
    queryKey: queryKeys.chiefCouriers,
    queryFn: ({ signal }) => fetchChiefCouriers(signal),
    enabled: needsList,
  });
  const list = couriers.data;
  return useMemo(() => {
    if (!sheet) return null;
    const courierRegions = list ? new Map(list.map((courier) => [courier.id, courier.region])) : null;
    return groupSheetByRegion(sheet, courierRegions, regionLabel);
  }, [sheet, list]);
}
