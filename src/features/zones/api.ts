import { api } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";

import { mapRegionsDictionary } from "./types";
import type { RegionDistricts } from "./types";

/**
 * Viloyat + tumanlar lug'ati. Server `ETag` beradi — takroriy so'rovni
 * brauzerning HTTP keshi `304` bilan yopadi; klientda 1 soat yangi.
 */
export async function fetchRegionsDictionary(
  signal?: AbortSignal,
): Promise<RegionDistricts[]> {
  const raw = await api.get<unknown>(ENDPOINTS.metaRegions, {
    signal,
    fallbackError: "Tumanlar ro'yxatini yuklashda xatolik",
  });
  return mapRegionsDictionary(raw);
}
