import type { QueryClient } from "@tanstack/react-query";

import type { Locale } from "@/lib/i18n/locale";
import { queryKeys } from "@/lib/query-keys";
import { currentLocale } from "@/stores/locale-store";

import { districtName, findDistrict } from "./types";
import type { RegionDistricts } from "./types";

/** Tuman kodi → UI tilidagi nom; katalogda bo'lmasa `null`. */
export type DistrictNameLookup = (code: string) => string | null;

/**
 * Server nom bermagan joylar uchun (WS qisqa kartasi, lentadagi eski
 * yozuvlar — `HUDUD_3` javobi Q7): kod `/meta/regions/` katalogidan nomlanadi.
 */
export function districtLookup(
  dictionary: readonly RegionDistricts[] | undefined,
  locale: Locale,
): DistrictNameLookup {
  return (code) => {
    const district = findDistrict(dictionary, code);
    return district ? districtName(district, locale) : null;
  };
}

/** React'dan tashqarida (soket ishlovchilari) — keshdagi katalog, so'rovsiz. */
export function cachedDistrictLookup(queryClient: QueryClient): DistrictNameLookup {
  return districtLookup(
    queryClient.getQueryData<RegionDistricts[]>(queryKeys.metaRegions),
    currentLocale(),
  );
}
