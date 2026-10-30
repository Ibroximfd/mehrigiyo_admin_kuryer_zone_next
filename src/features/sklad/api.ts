import { api, ApiError, type QueryValue } from "@/lib/api-client";
import { isEndpointMissing } from "@/lib/api-availability";
import { ENDPOINTS } from "@/lib/api-constants";
import { asPage } from "@/lib/paginate";
import { asArray, asInt, asRecord } from "@/lib/parse";

import {
  mapCourierDetail,
  mapCourierStock,
  mapDocument,
  mapFilialRef,
  mapGrant,
  mapItem,
  mapLedgerRow,
  mapLedgerSummary,
  mapLocation,
  mapOverview,
  mapRegionPanel,
  mapSkladMe,
  mapStockRow,
} from "./types";
import type {
  CourierDetail,
  CourierStock,
  DocumentType,
  FilialRef,
  LedgerRow,
  LedgerSummary,
  RegionPanel,
  SkladDocument,
  SkladItem,
  SkladLocation,
  SkladMe,
  SkladOverview,
  StockGrant,
  StockRow,
} from "./types";

/**
 * Sklad tarmoq qatlami — `18_SKLAD…` §1–§6, §15–§17.
 *
 * Backend chiqquncha `NEXT_PUBLIC_SKLAD_MOCK=1` bilan brauzer ichidagi
 * mock ishlaydi (`./mock`): u shartnomadagi JSON'ni aynan qaytaradi, shuning
 * uchun bu fayl ikkala holatda ham bir xil — faqat `request` manzili farq
 * qiladi. Endpoint hali yo'q bo'lsa (404, kodsiz) — `endpoint_missing`,
 * sahifa «backend kutilmoqda» holatini ko'rsatadi.
 */
const MOCK = process.env.NEXT_PUBLIC_SKLAD_MOCK === "1";

type Method = "get" | "post" | "put" | "patch" | "delete";

type Options = {
  searchParams?: Record<string, QueryValue>;
  json?: unknown;
  signal?: AbortSignal;
  fallbackError?: string;
};

async function request(method: Method, path: string, options: Options = {}): Promise<unknown> {
  if (MOCK) {
    const mock = await import("./mock");
    if (typeof window !== "undefined") mock.applyMockRole(window.location.search);
    return mock.mockRequest(method, path, options);
  }
  try {
    return await api[method]<unknown>(path, options);
  } catch (error) {
    if (isEndpointMissing(error)) throw notReadyError();
    throw error;
  }
}

function notReadyError(): ApiError {
  return new ApiError(
    "Sklad uchun backend hali chiqmagan",
    404,
    { code: "endpoint_missing" },
    "endpoint_missing",
  );
}

// ── Rol va lug'atlar ────────────────────────────────────────────────────────

export async function fetchSkladMe(signal?: AbortSignal): Promise<SkladMe> {
  return mapSkladMe(await request("get", ENDPOINTS.skladMe, { signal }));
}

export async function fetchLocations(signal?: AbortSignal): Promise<SkladLocation[]> {
  const raw = await request("get", ENDPOINTS.skladLocations, {
    searchParams: { kind: "region" },
    signal,
    fallbackError: "Omborlarni yuklashda xatolik",
  });
  return asArray(raw).map(mapLocation);
}

export async function fetchSkladFilials(signal?: AbortSignal): Promise<FilialRef[]> {
  const raw = await request("get", ENDPOINTS.skladFilials, { signal });
  return asArray(raw).map(mapFilialRef);
}

// ── Mahsulotlar (§3.3, §16, §17) ────────────────────────────────────────────

export type ItemsQuery = {
  q?: string;
  /** `on` · `off` — nazorat holati bo'yicha. */
  tracking?: "on" | "off" | null;
  barcode?: string;
};

export async function fetchItems(query: ItemsQuery = {}, signal?: AbortSignal): Promise<SkladItem[]> {
  const raw = await request("get", ENDPOINTS.skladItems, {
    searchParams: { q: query.q, tracking: query.tracking, barcode: query.barcode },
    signal,
    fallbackError: "Mahsulotlarni yuklashda xatolik",
  });
  return asArray(raw).map(mapItem);
}

export async function setItemPinned(itemId: number, pinned: boolean): Promise<void> {
  await request(pinned ? "put" : "delete", ENDPOINTS.skladItemPin(itemId), {
    fallbackError: "Qadashda xatolik",
  });
}

export type TrackingOnInput = {
  opening: Array<{ locationId: number; quantity: number }>;
  minQuantity: number;
  note: string;
};

export async function enableTracking(itemId: number, input: TrackingOnInput): Promise<void> {
  await request("post", ENDPOINTS.skladItemTrackingOn(itemId), {
    json: {
      opening: input.opening.map((row) => ({ location_id: row.locationId, quantity: row.quantity })),
      min_quantity: input.minQuantity,
      note: input.note,
    },
    fallbackError: "Nazoratni yoqishda xatolik",
  });
}

export async function disableTracking(itemId: number, reason: string): Promise<void> {
  await request("post", ENDPOINTS.skladItemTrackingOff(itemId), {
    json: { reason },
    fallbackError: "Nazoratni o'chirishda xatolik",
  });
}

export async function setMinQuantity(locationId: number, itemId: number, minQuantity: number): Promise<void> {
  await request("patch", ENDPOINTS.skladStockCell(locationId, itemId), {
    json: { min_quantity: minQuantity },
    fallbackError: "Minimal qoldiqni saqlashda xatolik",
  });
}

// ── Qoldiq (§3.4) ───────────────────────────────────────────────────────────

export async function fetchStock(
  query: { locationId?: number | null; itemId?: number | null },
  signal?: AbortSignal,
): Promise<StockRow[]> {
  const raw = await request("get", ENDPOINTS.skladStock, {
    searchParams: { location: query.locationId, item: query.itemId },
    signal,
  });
  return asArray(raw).map(mapStockRow);
}

// ── Daftar (§3.5, §6.3) ─────────────────────────────────────────────────────

export type LedgerQuery = {
  region?: string | null;
  locationId?: number | null;
  itemId?: number | null;
  movementTypes?: string[];
  dateFrom?: string | null;
  dateTo?: string | null;
  q?: string | null;
  page?: number;
};

export type LedgerPage = { rows: LedgerRow[]; totalCount: number; hasNextPage: boolean };

function ledgerParams(query: LedgerQuery): Record<string, QueryValue> {
  return {
    region: query.region,
    location: query.locationId,
    item: query.itemId,
    movement_type: query.movementTypes?.length ? query.movementTypes.join(",") : undefined,
    date_from: query.dateFrom,
    date_to: query.dateTo,
    q: query.q,
  };
}

export async function fetchLedger(query: LedgerQuery, signal?: AbortSignal): Promise<LedgerPage> {
  const raw = await request("get", ENDPOINTS.skladLedger, {
    searchParams: { ...ledgerParams(query), page: query.page ?? 1, page_size: 50 },
    signal,
    fallbackError: "Harakatlarni yuklashda xatolik",
  });
  const page = asPage(raw);
  return {
    rows: page.items.map(mapLedgerRow),
    totalCount: page.total ?? page.items.length,
    hasNextPage: page.hasMore,
  };
}

export async function fetchLedgerSummary(query: LedgerQuery, signal?: AbortSignal): Promise<LedgerSummary> {
  const raw = await request("get", ENDPOINTS.skladLedgerSummary, {
    searchParams: ledgerParams(query),
    signal,
  });
  return mapLedgerSummary(raw);
}

// ── Hujjatlar (§4) ──────────────────────────────────────────────────────────

export type DocumentLine = { itemId: number; quantity: number };

export type DocumentInput =
  | { type: "receipt"; locationId: number; supplier: string; refNumber: string; note: string; lines: DocumentLine[] }
  | { type: "write_off"; locationId: number; reason: string; note: string; lines: DocumentLine[] }
  | { type: "courier_load"; locationId: number; courierId: number; note: string; lines: DocumentLine[] }
  | { type: "courier_return"; locationId: number; courierId: number; mode: "all" | "partial"; note: string; lines: DocumentLine[] }
  | { type: "adjustment"; courierId: number | null; locationId: number | null; reason: string; note: string; lines: Array<{ itemId: number; actualQty: number }> };

function documentPayload(input: DocumentInput): Record<string, unknown> {
  const lines = (rows: DocumentLine[]) => rows.map((row) => ({ item_id: row.itemId, quantity: row.quantity }));
  switch (input.type) {
    case "receipt":
      return { type: input.type, location_id: input.locationId, supplier: input.supplier, ref_number: input.refNumber, note: input.note, lines: lines(input.lines) };
    case "write_off":
      return { type: input.type, location_id: input.locationId, reason: input.reason, note: input.note, lines: lines(input.lines) };
    case "courier_load":
      return { type: input.type, location_id: input.locationId, courier_id: input.courierId, note: input.note, lines: lines(input.lines) };
    case "courier_return":
      return { type: input.type, location_id: input.locationId, courier_id: input.courierId, mode: input.mode, note: input.note, lines: lines(input.lines) };
    case "adjustment":
      return {
        type: input.type,
        courier_id: input.courierId,
        location_id: input.locationId,
        reason: input.reason,
        note: input.note,
        lines: input.lines.map((row) => ({ item_id: row.itemId, actual_qty: row.actualQty })),
      };
  }
}

export async function createDocument(input: DocumentInput): Promise<SkladDocument> {
  const raw = await request("post", ENDPOINTS.skladDocuments, {
    json: documentPayload(input),
    fallbackError: "Hujjatni saqlashda xatolik",
  });
  return mapDocument(raw);
}

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  receipt: "Kirim",
  write_off: "Chiqim",
  courier_load: "Kuryerga berish",
  courier_return: "Kuryerdan qabul",
  adjustment: "Tuzatish",
};

// ── Ekranlar (§6) ───────────────────────────────────────────────────────────

export async function fetchOverview(signal?: AbortSignal): Promise<SkladOverview> {
  return mapOverview(
    await request("get", ENDPOINTS.skladOverview, { signal, fallbackError: "Doskani yuklashda xatolik" }),
  );
}

export async function fetchRegionPanel(code: string, signal?: AbortSignal): Promise<RegionPanel> {
  return mapRegionPanel(
    await request("get", ENDPOINTS.skladRegionPanel(code), { signal, fallbackError: "Viloyatni yuklashda xatolik" }),
  );
}

export async function fetchSkladCouriers(region: string | null, signal?: AbortSignal): Promise<CourierStock[]> {
  const raw = await request("get", ENDPOINTS.skladCouriers, {
    searchParams: { region },
    signal,
    fallbackError: "Kuryerlarni yuklashda xatolik",
  });
  return asArray(raw).map(mapCourierStock);
}

export async function fetchSkladCourier(id: number, signal?: AbortSignal): Promise<CourierDetail> {
  return mapCourierDetail(
    await request("get", ENDPOINTS.skladCourierDetail(id), { signal, fallbackError: "Kuryerni yuklashda xatolik" }),
  );
}

// ── Dopusk (§15) ────────────────────────────────────────────────────────────

export async function fetchGrants(itemId: number | null, signal?: AbortSignal): Promise<StockGrant[]> {
  const raw = await request("get", ENDPOINTS.skladGrants, { searchParams: { item: itemId }, signal });
  return asArray(raw).map(mapGrant);
}

export async function createGrants(input: { itemIds: number[]; filialId: number; note: string }): Promise<StockGrant[]> {
  const raw = await request("post", ENDPOINTS.skladGrants, {
    json: { item_ids: input.itemIds, filial_id: input.filialId, note: input.note },
    fallbackError: "Dopusk berishda xatolik",
  });
  return asArray(raw).map(mapGrant);
}

export async function revokeGrant(id: number): Promise<void> {
  await request("delete", ENDPOINTS.skladGrant(id), { fallbackError: "Dopuskni bekor qilishda xatolik" });
}

/** `grant_required` xatosidan aybdor mahsulot id'si. */
export function grantRequiredItemId(error: unknown): number | null {
  if (!(error instanceof ApiError) || error.code !== "grant_required") return null;
  return asInt(asRecord(error.data).item_id) || null;
}
