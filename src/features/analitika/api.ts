import { api, ApiError } from "@/lib/api-client";
import { isEndpointMissing } from "@/lib/api-availability";
import { ENDPOINTS } from "@/lib/api-constants";
import { periodParams, type PeriodFilter } from "@/lib/period-filter";

import { mapFunnel, type Funnel } from "./types";

/**
 * Analitika — bitta so'rov (§8). Backend chiqquncha
 * `NEXT_PUBLIC_SKLAD_MOCK=1` — brauzer ichidagi mock.
 */
const MOCK = process.env.NEXT_PUBLIC_SKLAD_MOCK === "1";

export async function fetchFunnel(filter: PeriodFilter, signal?: AbortSignal): Promise<Funnel> {
  const params = periodParams(filter);
  if (MOCK) {
    const mock = await import("./mock");
    return mapFunnel(await mock.mockFunnel(params));
  }
  try {
    return mapFunnel(await api.get<unknown>(ENDPOINTS.analyticsFunnel, { searchParams: params, signal }));
  } catch (error) {
    if (isEndpointMissing(error)) {
      throw new ApiError("Analitika uchun backend hali chiqmagan", 404, { code: "endpoint_missing" }, "endpoint_missing");
    }
    throw error;
  }
}
