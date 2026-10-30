import { api, ApiError, type QueryValue } from "@/lib/api-client";
import { isEndpointMissing } from "@/lib/api-availability";
import { ENDPOINTS } from "@/lib/api-constants";

import {
  DELIVERY_PAGE_SIZE,
  mapBaseBoard,
  mapColumnPage,
  mapDeliveryBoard,
  mapLeadDetail,
} from "./types";
import type { LeadDetail, PipelineBoard } from "./types";

/**
 * Bitrix oqimi doskalari (`LOGIST_01` §3–4, §7).
 *
 * Ikkala doska ham **har ustunga** `?limit=` (sukut 50, max 500) va
 * `?offset=` (ustun ichida) oladi — 10 000 lidda ham javob ~600 ms. Ustun
 * davomi: Bazada — ustun endpointi (`fetchBaseColumnPage`, v2); Dostavkada
 * logist ustun endpointi yo'q, o'sha doska `offset` bilan so'raladi va
 * kerakli ustun olinadi (`board-ops.appendColumnPage`).
 *
 * Marshrut hali chiqmagan (prod) bo'lsa `endpoint_missing` — sahifa
 * "backend kutilmoqda" holatini ko'rsatadi.
 */
function notReadyError(): ApiError {
  return new ApiError(
    "Dostavka va Baza doskalari uchun backend hali chiqmagan",
    404,
    { code: "endpoint_missing" },
    "endpoint_missing",
  );
}

export type BoardPageParams = {
  filters: Record<string, QueryValue>;
  offset?: number;
  limit?: number;
};

function pageParams({ filters, offset = 0, limit = DELIVERY_PAGE_SIZE }: BoardPageParams) {
  return { ...filters, limit, offset };
}

async function getBoard(
  path: string,
  params: BoardPageParams,
  map: (raw: unknown) => PipelineBoard,
  signal?: AbortSignal,
): Promise<PipelineBoard> {
  try {
    const raw = await api.get<unknown>(path, {
      searchParams: pageParams(params),
      signal,
      fallbackError: "Doskani yuklashda xatolik",
    });
    return map(raw);
  } catch (error) {
    if (isEndpointMissing(error)) throw notReadyError();
    throw error;
  }
}

/** Dostavka — `Order.filial` = logist filiali (yetkazuvchi filial). */
export function fetchDeliveryBoard(
  params: BoardPageParams,
  signal?: AbortSignal,
): Promise<PipelineBoard> {
  return getBoard(ENDPOINTS.logistDeliveryBoard, params, mapDeliveryBoard, signal);
}

/** Baza — faqat o'qish (`read_only: true`). */
export function fetchBaseBoard(
  params: BoardPageParams,
  signal?: AbortSignal,
): Promise<PipelineBoard> {
  return getBoard(ENDPOINTS.logistBaseKanban, params, mapBaseBoard, signal);
}

/**
 * Baza ustuni davomi — faqat shu ustun, 50 tadan (v2): butun doskani
 * `offset` bilan qayta so'rash shart emas. Admin ustun endpointi logistga
 * ochilmagan (403) yoki hali yo'q bo'lsa — zaxira: doska `offset` bilan.
 */
export async function fetchBaseColumnPage(
  columnKey: string,
  params: BoardPageParams,
  signal?: AbortSignal,
): Promise<PipelineBoard> {
  try {
    const raw = await api.get<unknown>(ENDPOINTS.baseKanbanColumn(columnKey), {
      searchParams: { ...pageParams(params), stage: "base" },
      signal,
      fallbackError: "Davomini yuklashda xatolik",
    });
    return mapColumnPage("base", columnKey, raw);
  } catch (error) {
    const closed = error instanceof ApiError && error.status === 403;
    if (!closed && !isEndpointMissing(error)) throw error;
    return fetchBaseBoard(params, signal);
  }
}

/**
 * Dostavka/Bazadagi lid kartasi. Lidlardagi karta logistga yopiq —
 * 403/404 keladi; chaqiruvchi "ko'rish huquqi yo'q" holatini chizadi.
 */
export async function fetchLeadDetail(
  id: number,
  signal?: AbortSignal,
): Promise<LeadDetail> {
  const raw = await api.get<unknown>(ENDPOINTS.leadDetail(id), {
    signal,
    fallbackError: "Lid kartasini yuklashda xatolik",
  });
  const detail = mapLeadDetail(raw);
  if (!detail) {
    throw new ApiError("Lid kartasi topilmadi", 404, { code: "lead_not_found" }, "lead_not_found");
  }
  return detail;
}
