import { api, ApiError, type QueryValue } from "@/lib/api-client";
import { isEndpointMissing } from "@/lib/api-availability";
import { ENDPOINTS } from "@/lib/api-constants";
import { periodParams, type PeriodFilter } from "@/lib/period-filter";

import { mapAiReport, type AiReport } from "./types";

/** AI tahlil (§9) — topilmalar va qo'lda qayta tahlil. Mock — `NEXT_PUBLIC_SKLAD_MOCK=1`. */
const MOCK = process.env.NEXT_PUBLIC_SKLAD_MOCK === "1";

async function request(method: "get" | "post", path: string, searchParams?: Record<string, QueryValue>, signal?: AbortSignal): Promise<unknown> {
  if (MOCK) {
    const mock = await import("./mock");
    return mock.mockAi(method, path);
  }
  try {
    return await api[method]<unknown>(path, { searchParams, signal });
  } catch (error) {
    if (isEndpointMissing(error)) {
      throw new ApiError("AI tahlil uchun backend hali chiqmagan", 404, { code: "endpoint_missing" }, "endpoint_missing");
    }
    throw error;
  }
}

export async function fetchAiFindings(filter: PeriodFilter, signal?: AbortSignal): Promise<AiReport> {
  return mapAiReport(await request("get", ENDPOINTS.aiFindings, periodParams(filter), signal));
}

/** Qo'lda qayta tahlil (`logist.main`); avtomatik har kuni 06:00. */
export async function runAiAnalysis(): Promise<void> {
  await request("post", ENDPOINTS.aiRun);
}
