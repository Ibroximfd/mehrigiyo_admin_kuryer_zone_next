"use client";

import { useMemo } from "react";

import { useLocaleStore } from "@/stores/locale-store";

import { districtAreaOptions, regionAreaOptions, zoneAreaOptions } from "./area-filter";
import type { AreaCounts, AreaFilter, AreaOption } from "./area-filter";
import type { RegionDistricts, Zone } from "./types";

/**
 * Viloyat · Zona · Tuman tanlovlari bitta joyda hisoblanadi — uchta sahifa
 * bir xil manbadan (`/meta/regions/`, `/zones/`) va bir xil tartibda
 * ko'rsatadi. `counts` berilsa (`useUnassignedCounts`) sonlar ham chiqadi.
 */
export function useAreaOptions({
  filter,
  zones,
  dictionary,
  counts = null,
  noneLabel = "Hududi noma'lum",
}: {
  filter: AreaFilter;
  zones: readonly Zone[] | undefined;
  dictionary: readonly RegionDistricts[] | undefined;
  /** Server hisobi (`unassigned-counts/`); `null`/`undefined` — sonsiz. */
  counts?: AreaCounts | null;
  noneLabel?: string;
}): {
  regionOptions: AreaOption[];
  zoneOptions: AreaOption[];
  districtOptions: AreaOption[];
} {
  const locale = useLocaleStore((state) => state.locale);

  return useMemo(() => {
    const zoneList = zones ?? [];
    const regions = dictionary ?? [];
    return {
      regionOptions: regionAreaOptions(regions, counts),
      zoneOptions: zoneAreaOptions(filter.regions, zoneList, counts, noneLabel),
      districtOptions: districtAreaOptions(filter, zoneList, regions, counts, locale),
    };
  }, [filter, zones, dictionary, counts, locale, noneLabel]);
}
