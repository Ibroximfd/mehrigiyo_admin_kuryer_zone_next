import { mapCourierCandidates } from "@/features/couriers/candidates";
import type { CourierCandidates } from "@/features/couriers/candidates";
import { mapCourier } from "@/features/couriers/types";
import type { Courier } from "@/features/couriers/types";
import { patchWarningCodes } from "@/features/orders/assign-warnings";
import { mapLogistOrder } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import { mapZone } from "@/features/zones/types";
import type { Zone } from "@/features/zones/types";
import { api, ApiError } from "@/lib/api-client";
import type { QueryValue } from "@/lib/api-client";
import { isEndpointMissing } from "@/lib/api-availability";
import { ENDPOINTS } from "@/lib/api-constants";
import { asPage } from "@/lib/paginate";
import { asOptionalString, asRecord, isRecord } from "@/lib/parse";

import {
  mapAutoAssignOutcome,
  mapChiefCash,
  mapChiefCouriers,
  mapChiefHandover,
  mapChiefHandovers,
  mapChiefMe,
  mapChiefOptions,
  mapChiefStats,
  mapChiefZones,
} from "./types";
import type {
  AutoAssignOutcome,
  ChiefCash,
  ChiefHandover,
  ChiefMe,
  ChiefOption,
  ChiefOrderScope,
  ChiefStats,
  ChiefZones,
} from "./types";

/**
 * Bosh kuryer tarmoq qatlami (backend K1, 2026-10-30 §C). Endpoint hali
 * chiqmagan bo'lsa (404) — `endpoint_missing`: logist tomoni tugmani
 * yashiradi, bo'lim navigatsiyada ko'rinmaydi.
 */
function notReady(): ApiError {
  return new ApiError("Bosh kuryer uchun backend hali chiqmagan", 404, { code: "endpoint_missing" }, "endpoint_missing");
}

async function call<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (isEndpointMissing(error)) throw notReady();
    throw error;
  }
}

// ── Logist tomoni ─────────────────────────────────────────────────────────

export function fetchChiefOptions(region: string | null, signal?: AbortSignal): Promise<ChiefOption[]> {
  return call(async () =>
    mapChiefOptions(
      await api.get<unknown>(ENDPOINTS.logistChiefs, { searchParams: { region }, signal }),
    ),
  );
}

export function fetchChiefHandovers(
  params: { status?: string | null; chiefId?: number | null; page?: number },
  signal?: AbortSignal,
): Promise<{ results: ChiefHandover[]; count: number }> {
  return call(async () =>
    mapChiefHandovers(
      await api.get<unknown>(ENDPOINTS.logistChiefHandovers, {
        searchParams: { status: params.status ?? null, chief_id: params.chiefId ?? null, page: params.page ?? 1 },
        signal,
      }),
    ),
  );
}

/** `confirmedAmount` berilmasa — e'lon qilingan summa bilan teng (`confirmed`). */
export function confirmChiefHandover(id: number, input: { confirmedAmount?: number; note?: string }): Promise<ChiefHandover | null> {
  const json: Record<string, unknown> = {};
  if (input.confirmedAmount !== undefined) json.confirmed_amount = input.confirmedAmount;
  if (input.note) json.note = input.note;
  return call(async () =>
    mapChiefHandover(
      await api.post<unknown>(ENDPOINTS.logistChiefHandoverConfirm(id), {
        json,
        fallbackError: "Topshiriqni qabul qilishda xatolik",
      }),
    ),
  );
}

// ── Bosh kuryer bo'limi ───────────────────────────────────────────────────

export function fetchChiefMe(signal?: AbortSignal): Promise<ChiefMe> {
  return call(async () => mapChiefMe(await api.get<unknown>(ENDPOINTS.chiefMe, { signal })));
}

export type ChiefOrdersQuery = {
  scope: ChiefOrderScope;
  courierId?: number | null;
  page?: number;
};

export function fetchChiefOrders(
  query: ChiefOrdersQuery,
  signal?: AbortSignal,
): Promise<{ orders: LogistOrder[]; count: number; hasMore: boolean }> {
  const searchParams: Record<string, QueryValue> = {
    scope: query.scope,
    courier_id: query.courierId ?? null,
    page: query.page ?? 1,
  };
  return call(async () => {
    const page = asPage(await api.get<unknown>(ENDPOINTS.chiefOrders, { searchParams, signal }));
    return { orders: page.items.map(mapLogistOrder), count: page.total ?? page.items.length, hasMore: page.hasMore };
  });
}

export function fetchChiefCandidates(orderId: string, signal?: AbortSignal): Promise<CourierCandidates> {
  return call(async () =>
    mapCourierCandidates(
      await api.get<unknown>(ENDPOINTS.chiefOrderCandidates(orderId), {
        signal,
        fallbackError: "Nomzod kuryerlarni yuklashda xatolik",
      }),
    ),
  );
}

/** `courierId: null` — kuryerdan olib, zakazni yana «kelganlar» ga. */
export function assignChiefOrder(
  orderId: string,
  courierId: number | null,
): Promise<{ order: LogistOrder; warnings: string[] }> {
  return call(async () => {
    const raw = await api.post<unknown>(ENDPOINTS.chiefOrderAssign(orderId), {
      json: { courier_id: courierId },
      fallbackError: "Kuryerga biriktirishda xatolik",
    });
    const json = asRecord(raw);
    return {
      order: mapLogistOrder(isRecord(json.order) ? json.order : raw),
      warnings: patchWarningCodes(json),
    };
  });
}

export function autoAssignChiefOrders(orderIds?: string[]): Promise<AutoAssignOutcome> {
  return call(async () =>
    mapAutoAssignOutcome(
      await api.post<unknown>(ENDPOINTS.chiefAutoAssign, {
        json: orderIds?.length ? { order_ids: orderIds } : {},
        fallbackError: "Avto taqsimlashda xatolik",
      }),
    ),
  );
}

export function fetchChiefCouriers(signal?: AbortSignal): Promise<Courier[]> {
  return call(async () => mapChiefCouriers(await api.get<unknown>(ENDPOINTS.chiefCouriers, { signal })));
}

export type ChiefCourierInput = {
  fullName: string;
  phone?: string;
  region?: string | null;
  zoneIds?: number[];
  withAccount?: boolean;
  password?: string;
};

/** Javobda `password` faqat yaratishda, bir marta. */
export function createChiefCourier(input: ChiefCourierInput): Promise<{ courier: Courier; password: string | null }> {
  const json: Record<string, unknown> = { full_name: input.fullName };
  if (input.phone) json.phone = input.phone;
  if (input.region) json.region = input.region;
  if (input.zoneIds?.length) json.zone_ids = input.zoneIds;
  if (input.withAccount) {
    if (input.password) json.password = input.password;
    else json.create_account = true;
  }
  return call(async () => {
    const raw = await api.post<unknown>(ENDPOINTS.chiefCouriers, { json, fallbackError: "Kuryer qo'shishda xatolik" });
    const body = asRecord(raw);
    return {
      courier: mapCourier(isRecord(body.courier) ? body.courier : raw),
      password: asOptionalString(body.password),
    };
  });
}

export function updateChiefCourier(
  id: number,
  patch: { fullName?: string; phone?: string; isActive?: boolean; zoneIds?: number[] },
): Promise<Courier> {
  const json: Record<string, unknown> = {};
  if (patch.fullName !== undefined) json.full_name = patch.fullName;
  if (patch.phone !== undefined) json.phone = patch.phone;
  if (patch.isActive !== undefined) json.is_active = patch.isActive;
  if (patch.zoneIds !== undefined) json.zone_ids = patch.zoneIds;
  return call(async () =>
    mapCourier(await api.patch<unknown>(ENDPOINTS.chiefCourier(id), { json, fallbackError: "Kuryerni saqlashda xatolik" })),
  );
}

export function attachChiefCourier(id: number): Promise<void> {
  return call(async () => {
    await api.post<unknown>(ENDPOINTS.chiefCourierAttach(id), { fallbackError: "Kuryerni jamoaga qo'shishda xatolik" });
  });
}

export function detachChiefCourier(id: number): Promise<void> {
  return call(async () => {
    await api.post<unknown>(ENDPOINTS.chiefCourierDetach(id), { fallbackError: "Kuryerni jamoadan chiqarishda xatolik" });
  });
}

export function fetchChiefZones(signal?: AbortSignal): Promise<ChiefZones> {
  return call(async () => mapChiefZones(await api.get<unknown>(ENDPOINTS.chiefZones, { signal })));
}

export type ChiefZoneInput = {
  region?: string;
  name?: string;
  districtCodes?: string[];
  isActive?: boolean;
};

function zoneJson(input: ChiefZoneInput): Record<string, unknown> {
  const json: Record<string, unknown> = {};
  if (input.region !== undefined) json.region = input.region;
  if (input.name !== undefined) json.name = input.name;
  if (input.districtCodes !== undefined) json.district_codes = input.districtCodes;
  if (input.isActive !== undefined) json.is_active = input.isActive;
  return json;
}

export function createChiefZone(input: ChiefZoneInput): Promise<Zone | null> {
  return call(async () =>
    mapZone(await api.post<unknown>(ENDPOINTS.chiefZones, { json: zoneJson(input), fallbackError: "Zona yaratishda xatolik" })),
  );
}

export function updateChiefZone(id: number, input: ChiefZoneInput): Promise<Zone | null> {
  return call(async () =>
    mapZone(await api.patch<unknown>(ENDPOINTS.chiefZone(id), { json: zoneJson(input), fallbackError: "Zonani saqlashda xatolik" })),
  );
}

export function fetchChiefCash(range: { from: string; to: string }, signal?: AbortSignal): Promise<ChiefCash> {
  return call(async () =>
    mapChiefCash(
      await api.get<unknown>(ENDPOINTS.chiefCash, { searchParams: { date_from: range.from, date_to: range.to }, signal }),
    ),
  );
}

export function submitChiefHandover(input: {
  amount: number;
  periodFrom?: string | null;
  periodTo?: string | null;
  note?: string;
  clientActionId: string;
}): Promise<ChiefHandover | null> {
  const json: Record<string, unknown> = { amount: input.amount, client_action_id: input.clientActionId };
  if (input.periodFrom) json.period_from = input.periodFrom;
  if (input.periodTo) json.period_to = input.periodTo;
  if (input.note) json.note = input.note;
  return call(async () =>
    mapChiefHandover(
      await api.post<unknown>(ENDPOINTS.chiefCashHandover, { json, fallbackError: "Pulni topshirishda xatolik" }),
    ),
  );
}

export function fetchChiefStats(range: { from: string; to: string }, signal?: AbortSignal): Promise<ChiefStats> {
  return call(async () =>
    mapChiefStats(
      await api.get<unknown>(ENDPOINTS.chiefStats, { searchParams: { date_from: range.from, date_to: range.to }, signal }),
    ),
  );
}
