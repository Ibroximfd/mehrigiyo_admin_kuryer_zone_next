import { api } from "@/shared/lib/api-client";

import { regionsResponseSchema, type Region } from "../model/region";

/**
 * Tokensiz ma'lumotnoma. Server `ETag` beradi — takroriy so'rovni brauzer
 * HTTP keshi `If-None-Match` → `304` bilan o'zi yopadi.
 */
export function fetchRegions(signal?: AbortSignal): Promise<Region[]> {
  return api.get("meta/regions/", { schema: regionsResponseSchema, signal });
}
