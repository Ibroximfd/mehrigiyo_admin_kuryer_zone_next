import { api, ApiError, type QueryValue } from "@/lib/api-client";
import { isEndpointMissing } from "@/lib/api-availability";
import { API_BASE_URL, ENDPOINTS } from "@/lib/api-constants";
import { asArray } from "@/lib/parse";
import { sessionStorage } from "@/lib/session-storage";

import { exportFileName, periodParams, type PeriodFilter } from "@/lib/period-filter";
import {
  mapFinanceProduct,
  mapFinanceSettings,
  mapFinanceSummary,
  mapGiftRow,
  mapOperatorDetail,
  mapOperatorRow,
  mapPointsRow,
  type FinanceProduct,
  type FinanceSettings,
  type FinanceSummary,
  type GiftRow,
  type OperatorDetail,
  type OperatorRow,
  type PointsRow,
} from "./types";

/**
 * Moliya tarmoq qatlami — §7. Hamma so'rov `?filial=&date_from=&date_to=`
 * bilan (§2). Backend chiqquncha `NEXT_PUBLIC_SKLAD_MOCK=1` — brauzer
 * ichidagi mock (`./mock`), javob shakli bir xil.
 */
const MOCK = process.env.NEXT_PUBLIC_SKLAD_MOCK === "1";

async function request(method: "get" | "patch", path: string, options: { searchParams?: Record<string, QueryValue>; json?: unknown; signal?: AbortSignal } = {}): Promise<unknown> {
  if (MOCK) {
    const mock = await import("./mock");
    return mock.mockFinance(method, path, options.searchParams ?? {}, options.json);
  }
  try {
    return await api[method]<unknown>(path, options);
  } catch (error) {
    if (isEndpointMissing(error)) {
      throw new ApiError("Moliya uchun backend hali chiqmagan", 404, { code: "endpoint_missing" }, "endpoint_missing");
    }
    throw error;
  }
}

export async function fetchFinanceSettings(signal?: AbortSignal): Promise<FinanceSettings> {
  return mapFinanceSettings(await request("get", ENDPOINTS.financeSettings, { signal }));
}

export async function updateFinanceSettings(input: { logisticsPerOrder?: number; operatorPercent?: number; note: string }): Promise<FinanceSettings> {
  const json: Record<string, unknown> = { note: input.note };
  if (input.logisticsPerOrder !== undefined) json.logistics_per_order = input.logisticsPerOrder.toFixed(2);
  if (input.operatorPercent !== undefined) json.operator_percent = input.operatorPercent.toFixed(2);
  return mapFinanceSettings(await request("patch", ENDPOINTS.financeSettings, { json }));
}

export async function fetchFinanceSummary(filter: PeriodFilter, signal?: AbortSignal): Promise<FinanceSummary> {
  return mapFinanceSummary(await request("get", ENDPOINTS.financeSummary, { searchParams: periodParams(filter), signal }));
}

export async function fetchFinanceProducts(filter: PeriodFilter, signal?: AbortSignal): Promise<FinanceProduct[]> {
  return asArray(await request("get", ENDPOINTS.financeProducts, { searchParams: periodParams(filter), signal })).map(mapFinanceProduct);
}

export async function fetchFinanceGifts(filter: PeriodFilter, signal?: AbortSignal): Promise<GiftRow[]> {
  return asArray(await request("get", ENDPOINTS.financeGifts, { searchParams: periodParams(filter), signal })).map(mapGiftRow);
}

export async function fetchFinancePoints(filter: PeriodFilter, signal?: AbortSignal): Promise<PointsRow[]> {
  return asArray(await request("get", ENDPOINTS.financePoints, { searchParams: periodParams(filter), signal })).map(mapPointsRow);
}

export async function fetchFinanceOperators(filter: PeriodFilter, signal?: AbortSignal): Promise<OperatorRow[]> {
  return asArray(await request("get", ENDPOINTS.financeOperators, { searchParams: periodParams(filter), signal })).map(mapOperatorRow);
}

export async function fetchFinanceOperator(id: number, filter: PeriodFilter, signal?: AbortSignal): Promise<OperatorDetail> {
  return mapOperatorDetail(await request("get", ENDPOINTS.financeOperator(id), { searchParams: periodParams(filter), signal }));
}

/**
 * Eksport — o'sha endpoint `?format=xlsx` bilan, **joriy filtr** (§12).
 * Mock CSV beradi, backend XLSX — UI farqni sezmaydi (faqat fayl turi).
 */
export async function exportFinance(section: "moliya" | "operatorlar" | "mahsulotlar", filter: PeriodFilter): Promise<void> {
  const path = section === "operatorlar" ? ENDPOINTS.financeOperators : section === "mahsulotlar" ? ENDPOINTS.financeProducts : ENDPOINTS.financeSummary;
  let blob: Blob;
  let ext = "xlsx";
  if (MOCK) {
    const mock = await import("./mock");
    blob = await mock.mockFinanceExport(path, periodParams(filter));
    ext = "csv";
  } else {
    const params = new URLSearchParams({ ...stringParams(periodParams(filter)), format: "xlsx" });
    const response = await fetch(`${API_BASE_URL}${path}?${params}`, {
      headers: { Authorization: `Bearer ${sessionStorage.accessToken ?? ""}` },
    });
    if (!response.ok) throw new ApiError("Eksportda xatolik", response.status);
    blob = await response.blob();
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = exportFileName(section, filter, ext);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function stringParams(params: Record<string, QueryValue>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") out[key] = String(value);
  }
  return out;
}
