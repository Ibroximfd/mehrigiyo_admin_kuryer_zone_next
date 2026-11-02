import { api } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";

import { mapChiefRatings, ratingSearchParams } from "./types";
import type { ChiefRatings, RatingFilters } from "./types";

/** `GET chief/ratings/` — qatorlar sahifali, `summary` va `by_courier` butun to'plamdan. */
export async function fetchChiefRatings(filters: RatingFilters, signal?: AbortSignal): Promise<ChiefRatings> {
  return mapChiefRatings(
    await api.get<unknown>(ENDPOINTS.chiefRatings, {
      searchParams: ratingSearchParams(filters),
      signal,
      fallbackError: "Reytinglarni yuklashda xatolik",
    }),
  );
}
