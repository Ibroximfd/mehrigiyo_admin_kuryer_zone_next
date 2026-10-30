import { api, ApiError } from "@/lib/api-client";
import { isEndpointMissing } from "@/lib/api-availability";
import { ENDPOINTS } from "@/lib/api-constants";
import { asPage } from "@/lib/paginate";

import { mapActivityEntry } from "./types";
import type { ActivityPage } from "./types";

/**
 * Filial harakatlar jurnali — `BACKEND-LOGIST.md` §4.11.
 *
 * Lenta ikki manbadan yig'iladi: shu endpoint **to'liq tarixni** beradi
 * (boshqa qurilmada, boshqa smenada bo'lgani ham), WS hodisalari esa uni
 * jonli ushlab turadi. Endpoint yo'q bo'lsa `endpoint_missing` kodli xato
 * ko'tariladi va panel qurilma ko'rgan hodisalarga tushadi — sayt baribir
 * ishlaydi.
 */
function notReadyError(): ApiError {
  return new ApiError(
    "Harakatlar jurnali uchun backend hali chiqmagan",
    404,
    { code: "endpoint_missing" },
    "endpoint_missing",
  );
}

export async function fetchActivity(
  page = 1,
  signal?: AbortSignal,
): Promise<ActivityPage> {
  try {
    const raw = await api.get<unknown>(ENDPOINTS.logistActivity, {
      searchParams: { page },
      signal,
      fallbackError: "Jurnalni yuklashda xatolik",
    });

    const result = asPage(raw);
    return {
      entries: result.items.map((item, index) =>
        mapActivityEntry(item, index),
      ),
      hasNextPage: result.hasMore,
      totalCount: result.total,
    };
  } catch (error) {
    if (isEndpointMissing(error)) throw notReadyError();
    throw error;
  }
}
