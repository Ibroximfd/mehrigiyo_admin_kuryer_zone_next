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
import { asOptionalString, asRecord, asString, isRecord } from "@/lib/parse";

import {
  mapChiefCouriers,
  mapChiefMe,
  mapAutoAssignPreview,
  mapAutoAssignResult,
  mapChiefFilials,
  mapChiefOrderDetail,
  mapChiefZones,
} from "./types";
import type {
  AddressFixReason,
  AutoAssignPreviewRow,
  AutoAssignResult,
  ChiefFilial,
  ChiefMe,
  ChiefOrderDetail,
  ChiefOrderScope,
  ChiefZones,
  ReturnReason,
} from "./types";

/**
 * Bosh kuryer tarmoq qatlami (backend K1, 2026-10-30 §C). Endpoint hali
 * chiqmagan bo'lsa (404) — `endpoint_missing`: sayt «backend kutilmoqda»
 * holatini ko'rsatadi.
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

// ── Bosh kuryer bo'limi ───────────────────────────────────────────────────

export function fetchChiefMe(signal?: AbortSignal): Promise<ChiefMe> {
  return call(async () => mapChiefMe(await api.get<unknown>(ENDPOINTS.chiefMe, { signal })));
}

/** Zakazlar filtri — URLdagi qiymatlar. */
export type ChiefOrderFilters = {
  q?: string | null;
  from?: string | null;
  to?: string | null;
  zoneId?: number | null;
  courierId?: number | null;
  filialId?: number | null;
  region?: string | null;
  district?: string | null;
};

export type ChiefOrdersQuery = ChiefOrderFilters & {
  scope: ChiefOrderScope;
  page?: number;
};

/**
 * Server filtrlari (K1 §2.2 + V3): `scope`, `status`, `courier_id`, sana,
 * `q` (raqam, mijoz, telefon, manzil, mahsulot), `zone_id`, `filial_id`,
 * `region`, `district`, `page` (10 tadan). «Yetkazilgan» — `scope=all&status=delivered`.
 */
function orderFilterParams(query: ChiefOrdersQuery): Record<string, QueryValue> {
  return {
    scope: query.scope === "delivered" ? "all" : query.scope,
    status: query.scope === "delivered" ? "delivered" : null,
    q: query.q?.trim() || null,
    courier_id: query.courierId ?? null,
    zone_id: query.zoneId ?? null,
    filial_id: query.filialId ?? null,
    region: query.region ?? null,
    district: query.district ?? null,
    date_from: query.from ?? null,
    date_to: query.to ?? null,
  };
}

export function fetchChiefOrders(
  query: ChiefOrdersQuery,
  signal?: AbortSignal,
): Promise<{ orders: LogistOrder[]; count: number; hasMore: boolean }> {
  const searchParams: Record<string, QueryValue> = { ...orderFilterParams(query), page: query.page ?? 1 };
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

/** Kelgan zakazlar — sahifasiz (`page` berilmasa server oddiy ro'yxat qaytaradi, V3). */
export function fetchIncomingOrders(signal?: AbortSignal): Promise<LogistOrder[]> {
  return call(async () =>
    asPage(await api.get<unknown>(ENDPOINTS.chiefOrders, { searchParams: { scope: "incoming" }, signal })).items.map(mapLogistOrder),
  );
}

/**
 * Zakaz detali va tarixi (`chief/orders/{id}/`, V4). `404` — zakaz endi bosh
 * kuryerda emas (logistga qaytarilgan yoki boshqasiga o'tgan): kodsiz bo'lsa
 * ham «endpoint yo'q» deb o'qilmaydi — `order_gone`.
 */
export async function fetchChiefOrderDetail(id: string, signal?: AbortSignal): Promise<ChiefOrderDetail> {
  try {
    return mapChiefOrderDetail(await api.get<unknown>(ENDPOINTS.chiefOrder(id), { signal, fallbackError: "Zakazni yuklashda xatolik" }));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new ApiError("Zakaz endi sizda emas", 404, error.data, "order_gone");
    }
    throw error;
  }
}

/** Avto-taqsimlash rejasi (V5) — server qoidasi bilan; hech narsa yozilmaydi. */
export function previewAutoAssign(signal?: AbortSignal): Promise<AutoAssignPreviewRow[]> {
  return call(async () =>
    mapAutoAssignPreview(
      await api.post<unknown>(ENDPOINTS.chiefAutoAssignPreview, { json: {}, signal, fallbackError: "Rejani tuzishda xatolik" }),
    ),
  );
}

/** Tasdiqlangan rejani yuborish (V5): `assigned` va `failed[{id, code}]`. */
export function applyAutoAssign(
  assignments: ReadonlyArray<{ orderId: string; courierId: number }>,
  clientActionId: string,
): Promise<AutoAssignResult> {
  return call(async () =>
    mapAutoAssignResult(
      await api.post<unknown>(ENDPOINTS.chiefAutoAssignApply, {
        json: {
          assignments: assignments.map((row) => ({ order_id: row.orderId, courier_id: row.courierId })),
          client_action_id: clientActionId,
        },
        fallbackError: "Avto taqsimlashda xatolik",
      }),
    ),
  );
}

// ── Manzilni tuzatish va logistga qaytarish (`25_MANZIL_OZGARISHI` §5.1–5.2) ──

export type AddressFixInput = {
  district: string;
  addressText: string;
  landmark: string;
  reason: AddressFixReason;
  note: string;
};

/**
 * Faqat o'z viloyatlari ichida (tuman viloyatni belgilaydi). Xatolar:
 * `403 zone_other_region`, `409 order_closed`, `400 validation_error` (`fields`).
 * Javob — `chief/orders/{id}/` ning aynan o'zi (zakaz + `history[]`).
 * Mo'ljal har doim yuboriladi: bo'shatilsa o'chadi.
 */
export function fixChiefOrderAddress(orderId: string, input: AddressFixInput): Promise<ChiefOrderDetail> {
  const json: Record<string, unknown> = { district: input.district, reason: input.reason, landmark: input.landmark.trim() };
  if (input.addressText.trim()) json.address_text = input.addressText.trim();
  if (input.note.trim()) json.note = input.note.trim();
  // `call` siz: endpoint chiqqan (TZ 25), `404` — zakaz endi sizda emas (`gone`), «endpoint yo'q» emas.
  return api
    .patch<unknown>(ENDPOINTS.chiefOrderAddress(orderId), { json, fallbackError: "Manzilni saqlashda xatolik" })
    .then(mapChiefOrderDetail);
}

/**
 * Zakazni logistga qaytarish: bosh kuryer va kuryer olinadi, zakaz logist
 * taqsimlashiga (`needs_redispatch`). `other` da izoh majburiy (`400 fields.note`).
 */
export async function returnChiefOrder(orderId: string, input: { reason: ReturnReason; note: string }): Promise<void> {
  const json: Record<string, unknown> = { reason: input.reason };
  if (input.note.trim()) json.note = input.note.trim();
  await api.post<unknown>(ENDPOINTS.chiefOrderReturn(orderId), { json, fallbackError: "Logistga qaytarishda xatolik" });
}

/** Filiallar (V14) — filtrlar uchun. */
export function fetchChiefFilials(signal?: AbortSignal): Promise<ChiefFilial[]> {
  return call(async () => mapChiefFilials(await api.get<unknown>(ENDPOINTS.chiefFilials, { signal })));
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

/** Kuryer o'zgarishi: zona — bitta (§5b), bloklash — `isActive: false` + zonasiz. */
export type ChiefCourierPatch = { fullName?: string; phone?: string; isActive?: boolean; zoneIds?: number[] };

export function updateChiefCourier(id: number, patch: ChiefCourierPatch): Promise<Courier> {
  const json: Record<string, unknown> = {};
  if (patch.fullName !== undefined) json.full_name = patch.fullName;
  if (patch.phone !== undefined) json.phone = patch.phone;
  if (patch.isActive !== undefined) json.is_active = patch.isActive;
  if (patch.zoneIds !== undefined) json.zone_ids = patch.zoneIds;
  return call(async () =>
    mapCourier(await api.patch<unknown>(ENDPOINTS.chiefCourier(id), { json, fallbackError: "Kuryerni saqlashda xatolik" })),
  );
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

/** Ro'yxatda yo'q joyni qo'lda qo'shish — lug'atga tushadi va zonaga biriktiriladi. */
export function createChiefPlace(input: { region: string; name: string }): Promise<{ code: string; name: string }> {
  return call(async () => {
    const json = asRecord(
      await api.post<unknown>(ENDPOINTS.chiefPlaces, { json: input, fallbackError: "Joyni qo'shishda xatolik" }),
    );
    return { code: asString(json.code), name: asString(json.name_uz ?? json.name) };
  });
}

