import { api, ApiError, type QueryValue } from "@/lib/api-client";
import { isEndpointMissing } from "@/lib/api-availability";
import { ENDPOINTS } from "@/lib/api-constants";

import { mapLogistStatistics } from "./types";
import type { LogistStatistics } from "./types";

/**
 * Logist statistikasi — `BACKEND-LOGIST.md` §4.12.
 *
 * Davr parametrlari boshqa ekranlardagidek (`features/statistics/filter.ts`):
 * `date` > `date_from`/`date_to` > `period`.
 *
 * Endpoint bo'lmasa `endpoint_missing` kodli xato ko'tariladi — sahifa
 * doskadan olinadigan kesimda qoladi va yo'q bo'lgan bo'limlar o'rniga
 * halol izoh ko'rsatadi.
 */
function notReadyError(): ApiError {
  return new ApiError(
    "Logist statistikasi uchun backend hali chiqmagan",
    404,
    { code: "endpoint_missing" },
    "endpoint_missing",
  );
}

export async function fetchLogistStatistics(
  params: Record<string, QueryValue>,
  signal?: AbortSignal,
): Promise<LogistStatistics> {
  try {
    const raw = await api.get<unknown>(ENDPOINTS.logistStatistics, {
      searchParams: params,
      signal,
      fallbackError: "Statistikani yuklashda xatolik",
    });
    return mapLogistStatistics(raw);
  } catch (error) {
    if (isEndpointMissing(error)) throw notReadyError();
    throw error;
  }
}

/**
 * Kuryer manzil sonini qo'lda ±1 qiladi (`docs/MANZIL_SONI_BACKEND_TALABLAR.md`).
 * Faqat bitta kun uchun: avtomatik hisob o'zgarmaydi, tuzatish alohida
 * yoziladi va jurnalda kim qilgani ko'rinadi.
 */
export async function adjustCourierAddresses(
  courierId: number,
  input: { date: string; delta: 1 | -1; note?: string },
): Promise<void> {
  try {
    await api.post<unknown>(ENDPOINTS.logistCourierAddressAdjust(courierId), {
      json: { date: input.date, delta: input.delta, note: input.note ?? "" },
      fallbackError: "Manzil sonini o'zgartirishda xatolik",
    });
  } catch (error) {
    if (isEndpointMissing(error)) {
      throw new ApiError("Manzil sonini tuzatish uchun backend hali chiqmagan", 404, { code: "endpoint_missing" }, "endpoint_missing");
    }
    throw error;
  }
}
