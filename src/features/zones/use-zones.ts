"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { queryKeys } from "@/lib/query-keys";
import { useLocaleStore } from "@/stores/locale-store";

import { fetchRegionSettings, fetchRegionsDictionary, fetchZones } from "./api";
import { districtLookup } from "./district-lookup";
import type { DistrictNameLookup } from "./district-lookup";

const HOUR = 60 * 60 * 1000;

/** Viloyat + tumanlar lug'ati — kamdan-kam o'zgaradi (server keshi 1 soat). */
export function useRegionsDictionary() {
  return useQuery({
    queryKey: queryKeys.metaRegions,
    queryFn: ({ signal }) => fetchRegionsDictionary(signal),
    staleTime: HOUR,
    gcTime: HOUR,
    retry: 1,
  });
}

/** Tuman kodi → nom (katalog yuklanmaguncha har doim `null`). */
export function useDistrictLookup(): DistrictNameLookup {
  const dictionary = useRegionsDictionary();
  const locale = useLocaleStore((state) => state.locale);
  return useMemo(() => districtLookup(dictionary.data, locale), [dictionary.data, locale]);
}

/** Zonalar; `zone_updated` hodisasida `["zones"]` ildizi eskiradi. */
export function useZones(region: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.zones(region),
    queryFn: ({ signal }) => fetchZones(region, signal),
    staleTime: 5 * 60_000,
    retry: 1,
    enabled,
  });
}

/** Viloyatning avto-taqsimlash rejimi (faqat ko'rsatish uchun). */
export function useRegionSettings(region: string | null) {
  return useQuery({
    queryKey: queryKeys.regionSettings(region ?? ""),
    queryFn: ({ signal }) => fetchRegionSettings(region ?? "", signal),
    enabled: Boolean(region),
    staleTime: 5 * 60_000,
    retry: false,
  });
}
