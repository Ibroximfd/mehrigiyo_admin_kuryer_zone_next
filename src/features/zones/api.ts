import { api } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";

import { mapRegionsDictionary } from "./types";
import type { RegionDistricts } from "./types";

/**
 * Viloyat + tumanlar lug'ati — sayt bo'ylab yagona manba (zonalar, filtr,
 * manzil tuzatish). `include_inactive` — bosh kuryer yashirgan tumanlar ham
 * keladi (hujjat 51): nomi zakaz/zonada o'qiladi, tanlov ro'yxatlariga esa
 * faqat `isActive` lar tushadi. Server `ETag` beradi — takroriy so'rov `304`.
 */
export async function fetchRegionsDictionary(
  signal?: AbortSignal,
): Promise<RegionDistricts[]> {
  const raw = await api.get<unknown>(ENDPOINTS.metaRegions, {
    searchParams: { include_inactive: true },
    signal,
    fallbackError: "Tumanlar ro'yxatini yuklashda xatolik",
  });
  return mapRegionsDictionary(raw);
}
