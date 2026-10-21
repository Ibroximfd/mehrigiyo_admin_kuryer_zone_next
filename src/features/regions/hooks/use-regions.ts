"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { useLocale } from "@/shared/i18n/locale";
import { regionDisplayName } from "@/shared/i18n/region-names";

import { fetchRegions } from "../api/regions-api";
import type { Region } from "../model/region";

export const regionKeys = {
  all: ["regions"] as const,
};

const HOUR = 60 * 60 * 1000;

/**
 * Viloyatlar kamdan-kam o'zgaradi — 1 soat yangi hisoblanadi. Nom joriy
 * tilda (`ru` — mahalliy lug'atdan, kod bo'yicha); kesh esa tilga bog'liq emas.
 */
export function useRegions() {
  const locale = useLocale();
  const select = useCallback(
    (regions: Region[]) => regions.map((region) => ({ ...region, name: regionDisplayName(region.code, region.name, locale) })),
    [locale],
  );
  return useQuery({
    queryKey: regionKeys.all,
    queryFn: ({ signal }) => fetchRegions(signal),
    staleTime: HOUR,
    gcTime: HOUR,
    select,
  });
}
