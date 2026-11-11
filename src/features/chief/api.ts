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

/** Reja uchun sahifa hajmi — server `page_size` ni 200 gacha qabul qiladi (prodda o'lchandi, 2026-11-10). */
const INCOMING_PAGE_SIZE = 200;
/** Cheksiz aylanishdan himoya: 100 × 200 = 20 000 zakaz. */
const INCOMING_MAX_PAGES = 100;

export type IncomingProgress = { loaded: number; total: number | null };

/**
 * Kelgan zakazlar — HAMMASI (avto taqsimlash rejasi uchun). Avval 10 tadan ketma-ket
 * yig'ilardi: 477 zakazda 48 so'rov × ~0,4 s ≈ 20 s kutish (2026-11-10). Endi 1-sahifa
 * 200 tadan, `count` bo'yicha qolgan sahifalar bir vaqtda so'raladi — 2–3 so'rov.
 * Server `page_size` ni e'tiborsiz qoldirsa ham ishlaydi: sahifa hajmi 1-javobdan olinadi.
 */
export function fetchIncomingOrders(
  signal?: AbortSignal,
  onProgress?: (progress: IncomingProgress) => void,
): Promise<LogistOrder[]> {
  const fetchPage = async (page: number) =>
    asPage(
      await api.get<unknown>(ENDPOINTS.chiefOrders, {
        searchParams: { scope: "incoming", page, page_size: INCOMING_PAGE_SIZE },
        signal,
      }),
    );

  return call(async () => {
    const first = await fetchPage(1);
    let loaded = first.items.length;
    onProgress?.({ loaded, total: first.total });
    if (!first.hasMore || first.items.length === 0) return first.items.map(mapLogistOrder);

    // `count` yo'q bo'lsa — eski usul: `next` tugaguncha ketma-ket.
    if (first.total === null) {
      const items = [...first.items];
      for (let page = 2; page <= INCOMING_MAX_PAGES; page += 1) {
        const next = await fetchPage(page);
        items.push(...next.items);
        onProgress?.({ loaded: items.length, total: null });
        if (!next.hasMore) break;
      }
      return items.map(mapLogistOrder);
    }

    const pageCount = Math.min(Math.ceil(first.total / first.items.length), INCOMING_MAX_PAGES);
    const total = first.total;
    const rest = await Promise.all(
      Array.from({ length: pageCount - 1 }, async (_, index) => {
        const page = await fetchPage(index + 2);
        loaded += page.items.length;
        onProgress?.({ loaded, total });
        return page.items;
      }),
    );
    // Sahifalar orasida zakaz kuryerga o'tsa, siljish takror berishi mumkin — id bo'yicha bir marta.
    const byId = new Map<string, LogistOrder>();
    for (const raw of [first.items, ...rest].flat()) {
      const order = mapLogistOrder(raw);
      byId.set(order.id, order);
    }
    return [...byId.values()];
  });
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

/**
 * Avto-taqsimlash rejasi (V5) — server qoidasi bilan; hech narsa yozilmaydi.
 * `include_order` — har qatorga zakaz kartasi (51-javob): reja bitta so'rovda keladi.
 */
export function previewAutoAssign(signal?: AbortSignal): Promise<AutoAssignPreviewRow[]> {
  return call(async () =>
    mapAutoAssignPreview(
      await api.post<unknown>(ENDPOINTS.chiefAutoAssignPreview, { json: { include_order: true }, signal, fallbackError: "Rejani tuzishda xatolik" }),
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

export type ChiefPlacePatch = {
  /** Yangi nom (o'zbek lotin). */
  nameUz?: string;
  /** Ruscha nom; bo'sh — `null`, sayt `name_uz` ni ko'rsatadi. */
  nameRu?: string | null;
  /** `false` — tanlov ro'yxatlaridan yashiriladi (zonada bo'lsa server `409 district_in_zone`). */
  isActive?: boolean;
  /** Lug'atdagi asl nomga qaytarish. */
  resetName?: true;
};

/**
 * Tumanni tahrirlash (hujjat 51): nomi, ruscha nomi, yashirish/qaytarish.
 * O'zgarish `/meta/regions/` ga tushadi — zonalar, filtr, manzil tuzatish hammasi o'qiydi.
 */
export function updateChiefPlace(code: string, patch: ChiefPlacePatch): Promise<void> {
  const json: Record<string, unknown> = {};
  if (patch.nameUz !== undefined) json.name_uz = patch.nameUz;
  if (patch.nameRu !== undefined) json.name_ru = patch.nameRu;
  if (patch.isActive !== undefined) json.is_active = patch.isActive;
  if (patch.resetName) json.reset_name = true;
  return call(async () => {
    try {
      await api.patch<unknown>(ENDPOINTS.chiefPlace(code), { json, fallbackError: "Tumanni saqlashda xatolik" });
    } catch (error) {
      // Hozir `chief/places/` faqat POST — PATCH chiqmaguncha `405`: «backend kutilmoqda».
      if (error instanceof ApiError && error.status === 405) throw notReady();
      throw error;
    }
  });
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

