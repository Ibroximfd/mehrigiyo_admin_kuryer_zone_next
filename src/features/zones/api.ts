import { api } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";

import { mapAreaCounts } from "./area-filter";
import type { AreaCounts } from "./area-filter";
import { mapRegionSettings, mapRegionsDictionary, mapZones } from "./types";
import type { RegionDistricts, RegionSettings, Zone } from "./types";

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

/** Zonalar — faqat o'qish. `region` berilmasa hammasi. */
export async function fetchZones(
  region: string | null,
  signal?: AbortSignal,
): Promise<Zone[]> {
  const raw = await api.get<unknown>(ENDPOINTS.zones, {
    searchParams: { region },
    signal,
    fallbackError: "Zonalarni yuklashda xatolik",
  });
  return mapZones(raw);
}

export async function fetchRegionSettings(
  region: string,
  signal?: AbortSignal,
): Promise<RegionSettings> {
  const raw = await api.get<unknown>(ENDPOINTS.regionSettings(region), {
    signal,
    fallbackError: "Viloyat sozlamasini yuklashda xatolik",
  });
  return mapRegionSettings(raw);
}

/**
 * Kuryersiz (`confirmed`) buyurtmalar soni viloyat · zona · tuman bo'yicha —
 * logist filiali (admin — hamma). Sonlar filtr qatorida ko'rinadi.
 */
export async function fetchUnassignedCounts(signal?: AbortSignal): Promise<AreaCounts> {
  const raw = await api.get<unknown>(ENDPOINTS.logistUnassignedCounts, {
    signal,
    fallbackError: "Kuryersiz buyurtmalar sonini yuklashda xatolik",
  });
  return mapAreaCounts(raw);
}
