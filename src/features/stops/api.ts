import { api, ApiError } from "@/lib/api-client";
import { isEndpointMissing } from "@/lib/api-availability";
import { ENDPOINTS } from "@/lib/api-constants";

import {
  mapAutoResult,
  mapCreatedStop,
  mapPayRate,
  mapStopList,
  mapSuggestions,
} from "./types";
import type {
  DeliveryStop,
  PayRate,
  StopStatusFilter,
  StopSuggestion,
} from "./types";

/**
 * To'xtashlar va kuryer haqi stavkasi (`LOGIST_03` §2). Xato kodlari
 * (`stop_needs_two`, `different_*`, `already_in_stop`, `main_filial_only`…)
 * chaqiruvchida `stopErrorMessage` bilan matnga aylanadi.
 */
function notReadyError(): ApiError {
  return new ApiError(
    "Manzillar uchun backend hali chiqmagan",
    404,
    { code: "endpoint_missing" },
    "endpoint_missing",
  );
}

async function guard<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (isEndpointMissing(error)) throw notReadyError();
    throw error;
  }
}

export function fetchStops(
  params: { date: string; status: StopStatusFilter },
  signal?: AbortSignal,
): Promise<DeliveryStop[]> {
  return guard(async () =>
    mapStopList(
      await api.get<unknown>(ENDPOINTS.logistStops, {
        searchParams: { date: params.date || null, status: params.status },
        signal,
        fallbackError: "Manzillarni yuklashda xatolik",
      }),
    ),
  );
}

export function fetchStopSuggestions(
  date: string,
  signal?: AbortSignal,
): Promise<StopSuggestion[]> {
  return guard(async () =>
    mapSuggestions(
      await api.get<unknown>(ENDPOINTS.logistStopSuggestions, {
        searchParams: { date: date || null },
        signal,
        fallbackError: "Takliflarni yuklashda xatolik",
      }),
    ),
  );
}

/** Bir nechta buyurtmani bitta to'xtashga bog'laydi (kamida 2 ta). */
export function createStop(orderIds: readonly string[]): Promise<DeliveryStop | null> {
  return guard(async () =>
    mapCreatedStop(
      await api.post<unknown>(ENDPOINTS.logistStops, {
        json: { order_ids: orderIds },
        fallbackError: "Manzilni birlashtirishda xatolik",
      }),
    ),
  );
}

/** Hamma taklifni birdan to'xtashga aylantiradi. */
export function createAutoStops(date: string): Promise<{ count: number; created: DeliveryStop[] }> {
  return guard(async () =>
    mapAutoResult(
      await api.post<unknown>(ENDPOINTS.logistStopsAuto, {
        json: date ? { date } : {},
        fallbackError: "Avto-birlashtirishda xatolik",
      }),
    ),
  );
}

/** Buyurtmani to'xtashdan chiqaradi; bitta qolsa to'xtash `cancelled`. */
export function removeOrderFromStop(stopId: number, orderId: string): Promise<void> {
  return guard(async () => {
    await api.delete(ENDPOINTS.logistStopOrder(stopId, orderId), {
      fallbackError: "Buyurtmani ajratishda xatolik",
    });
  });
}

export function fetchPayRate(signal?: AbortSignal): Promise<PayRate> {
  return guard(async () =>
    mapPayRate(
      await api.get<unknown>(ENDPOINTS.logistPayRate, {
        signal,
        fallbackError: "Stavkani yuklashda xatolik",
      }),
    ),
  );
}

export function savePayRate(input: {
  perStop: number;
  effectiveFrom?: string | null;
  note?: string;
}): Promise<PayRate> {
  const json: Record<string, unknown> = { per_stop: input.perStop };
  if (input.effectiveFrom) json.effective_from = input.effectiveFrom;
  if (input.note?.trim()) json.note = input.note.trim();
  return guard(async () =>
    mapPayRate(
      await api.post<unknown>(ENDPOINTS.logistPayRate, {
        json,
        fallbackError: "Stavkani saqlashda xatolik",
      }),
    ),
  );
}
