import { api, ApiError } from "@/lib/api-client";
import { isEndpointMissing } from "@/lib/api-availability";
import { ENDPOINTS } from "@/lib/api-constants";
import { asPage } from "@/lib/paginate";

import {
  applyBody,
  mapAutoAssignPlan,
  mapAutoAssignResult,
  previewBody,
} from "./auto-assign";
import type {
  AutoAssignPlan,
  AutoAssignPlanRow,
  AutoAssignResult,
  AutoAssignScope,
  PlanOverrides,
} from "./auto-assign";
import { mapCourierCandidates } from "./candidates";
import type { CourierCandidates } from "./candidates";
import { mapInterfilialReport } from "./interfilial";
import type { InterfilialReport } from "./interfilial";
import {
  liveCourierFromCourier,
  mapCourierTrack,
  mapLiveCourier,
} from "./live-tracking";
import type { CourierTrack, LiveCourier, LiveParams } from "./live-tracking";
import {
  mapCodRange,
  mapCodSettleResult,
  mapCourier,
  mapCourierAccountResult,
  mapHandoverRow,
} from "./types";
import type {
  CodRange,
  CodSettleResult,
  Courier,
  CourierAccountResult,
  HandoverRow,
  HandoverStatus,
} from "./types";

/**
 * Kuryerlar — `BACKEND-LOGIST.md` §4 kontrakti.
 *
 * Endpoint hali chiqmagan bo'lsa `endpoint_missing` kodli xato ko'tariladi —
 * sahifa yumshoq "backend kutilmoqda" holatini ko'rsatadi, select esa
 * yashirinadi.
 */

function notReadyError(): ApiError {
  return new ApiError(
    "Kuryerlar bo'limi uchun backend hali chiqmagan",
    404,
    { code: "endpoint_missing" },
    "endpoint_missing",
  );
}

/**
 * Kuryerlar ro'yxati filtrlari (2026-10-15, A6/A7 2026-10-16): hammasi
 * ixtiyoriy. `zoneIds` — `?zone=7,8`; `districts` — `?district=kod[,kod]`
 * (tuman zonasi kuryerlari) — ikkalasi ham serverda.
 */
export type CourierFilters = {
  zoneIds?: readonly number[] | null;
  region?: string | null;
  districts?: readonly string[] | null;
  onShift?: boolean | null;
};

/** Bo'sh ro'yxat ham `null` — parametr yuborilmaydi. */
function joined(values: readonly (string | number)[] | null | undefined): string | null {
  return values?.length ? values.join(",") : null;
}

export function courierFilterParams(
  filters: CourierFilters = {},
): Record<string, string | null> {
  return {
    zone: joined(filters.zoneIds),
    region: filters.region?.trim() || null,
    district: joined(filters.districts),
    on_shift:
      typeof filters.onShift === "boolean" ? String(filters.onShift) : null,
  };
}

export async function fetchCouriers(
  signal?: AbortSignal,
  filters?: CourierFilters,
): Promise<Courier[]> {
  try {
    const raw = await api.get<unknown>(ENDPOINTS.couriers, {
      searchParams: courierFilterParams(filters),
      signal,
      fallbackError: "Kuryerlarni yuklashda xatolik",
    });
    return asPage(raw).items.map(mapCourier);
  } catch (error) {
    if (isEndpointMissing(error)) throw notReadyError();
    throw error;
  }
}

/**
 * Jonli xarita (§7.3): sukut — smenadagilar; `?all=1` — hammasi;
 * `?zone=&region=&district=` — hudud. Backend `couriers/live/` ni hali
 * chiqarmagan bo'lsa oddiy ro'yxat (`?on_shift=true` + hudud) ishlatiladi —
 * joriy buyurtma manzili va server ogohlantirishlarisiz.
 */
export async function fetchLiveCouriers(
  params: LiveParams,
  signal?: AbortSignal,
): Promise<LiveCourier[]> {
  try {
    const raw = await api.get<unknown>(ENDPOINTS.couriersLive, {
      searchParams: params,
      signal,
      fallbackError: "Jonli xaritani yuklashda xatolik",
    });
    return asPage(raw).items.map(mapLiveCourier);
  } catch (error) {
    if (!isEndpointMissing(error)) throw error;
  }
  const couriers = await fetchCouriers(signal, {
    region: params.region,
    zoneIds: params.zone ? params.zone.split(",").map(Number) : null,
    districts: params.district ? params.district.split(",") : null,
    onShift: params.all ? null : true,
  });
  return couriers.map(liveCourierFromCourier);
}

/** Kun izi: nuqtalar, to'xtashlar va umumiy masofa (`from`/`to` — ISO). */
export async function fetchCourierTrack(
  id: number,
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<CourierTrack> {
  try {
    const raw = await api.get<unknown>(ENDPOINTS.courierTrack(id), {
      searchParams: { from, to },
      signal,
      fallbackError: "Kun izini yuklashda xatolik",
    });
    return mapCourierTrack(raw);
  } catch (error) {
    if (isEndpointMissing(error)) throw notReadyError();
    throw error;
  }
}

/**
 * Kuryer qo'shish. `withAccount` bo'lsa ilova akkaunti ham ochiladi: parol
 * berilmasa server o'zi yasaydi va **javobda bir marta** qaytaradi.
 */
export async function createCourier(input: {
  fullName: string;
  phone: string;
  withAccount: boolean;
  password?: string;
}): Promise<CourierAccountResult> {
  const json: Record<string, unknown> = {
    full_name: input.fullName,
    phone: input.phone,
  };
  if (input.withAccount) {
    if (input.password) json.password = input.password;
    else json.create_account = true;
  }
  try {
    const raw = await api.post<unknown>(ENDPOINTS.logistCouriers, {
      json,
      fallbackError: "Kuryer qo'shishda xatolik",
    });
    return mapCourierAccountResult(raw);
  } catch (error) {
    if (isEndpointMissing(error)) throw notReadyError();
    throw error;
  }
}

export async function updateCourier(
  id: number,
  patch: { fullName?: string; phone?: string; isActive?: boolean },
): Promise<Courier> {
  const json: Record<string, unknown> = {};
  if (patch.fullName !== undefined) json.full_name = patch.fullName;
  if (patch.phone !== undefined) json.phone = patch.phone;
  if (patch.isActive !== undefined) json.is_active = patch.isActive;

  try {
    const raw = await api.patch<unknown>(ENDPOINTS.logistCourierDetail(id), {
      json,
      fallbackError: "Kuryerni yangilashda xatolik",
    });
    return mapCourier(raw);
  } catch (error) {
    if (isEndpointMissing(error)) throw notReadyError();
    throw error;
  }
}

/**
 * Ilova akkauntini ochish yoki parolni yangilash. Bo'sh parol — server
 * yasaydi. ⚠️ Kuryerning barcha qurilmasi uziladi.
 */
export async function setCourierPassword(
  id: number,
  password?: string,
): Promise<CourierAccountResult> {
  const raw = await api.post<unknown>(ENDPOINTS.logistCourierSetPassword(id), {
    json: password ? { password } : {},
    fallbackError: "Parolni o'rnatishda xatolik",
  });
  return mapCourierAccountResult(raw);
}

/** Ilovadan butunlay o'chirish (yozuv saqlanadi). */
export async function deactivateCourier(id: number): Promise<void> {
  await api.post(ENDPOINTS.logistCourierDeactivate(id), {
    fallbackError: "Kuryerni o'chirishda xatolik",
  });
}

/** Faqat qurilmani uzish — kuryer qayta kira oladi. */
export async function logoutCourierDevice(id: number): Promise<void> {
  await api.post(ENDPOINTS.logistCourierLogoutDevice(id), {
    fallbackError: "Qurilmadan chiqarishda xatolik",
  });
}

/** Haftalik (ko'pi bilan 31 kunlik) naqd ekrani. */
export async function fetchCourierCodRange(
  id: number,
  dateFrom: string,
  dateTo: string,
  signal?: AbortSignal,
): Promise<CodRange> {
  const raw = await api.get<unknown>(ENDPOINTS.logistCourierCod(id), {
    searchParams: { date_from: dateFrom, date_to: dateTo },
    signal,
    fallbackError: "Naqd hisobini yuklashda xatolik",
  });
  return mapCodRange(raw);
}

/**
 * Oraliqni bitta so'rovda yopish. `confirmedAmount` — logist sanagan pul,
 * butun oraliq uchun; berilmasa har kun o'z summasi bilan qabul qilinadi.
 */
export async function settleCourierCodRange(
  id: number,
  input: {
    dateFrom: string;
    dateTo: string;
    confirmedAmount: number | null;
    note: string;
  },
): Promise<CodSettleResult> {
  const json: Record<string, unknown> = {
    date_from: input.dateFrom,
    date_to: input.dateTo,
  };
  if (input.confirmedAmount !== null) {
    json.confirmed_amount = input.confirmedAmount;
  }
  if (input.note.trim()) json.note = input.note.trim();
  const raw = await api.post<unknown>(ENDPOINTS.logistCourierSettle(id), {
    json,
    fallbackError: "Naqdni yopishda xatolik",
  });
  return mapCodSettleResult(raw);
}

/** Kuryerlarning naqd topshirish e'lonlari. */
export async function fetchHandovers(
  status: HandoverStatus | null,
  signal?: AbortSignal,
): Promise<HandoverRow[]> {
  const raw = await api.get<unknown>(ENDPOINTS.logistCodHandovers, {
    searchParams: { status },
    signal,
    fallbackError: "E'lonlarni yuklashda xatolik",
  });
  return asPage(raw).items.map(mapHandoverRow);
}

/**
 * Bitta kunni yopish (kuryer e'loni bo'yicha). `confirmedAmount` berilmasa
 * kun o'z summasi bilan qabul qilinadi.
 */
export async function settleCourierCodDay(
  id: number,
  input: { date: string; confirmedAmount: number | null; note?: string },
): Promise<CodSettleResult> {
  const json: Record<string, unknown> = { date: input.date };
  if (input.confirmedAmount !== null) {
    json.confirmed_amount = input.confirmedAmount;
  }
  if (input.note?.trim()) json.note = input.note.trim();
  const raw = await api.post<unknown>(ENDPOINTS.logistCourierSettle(id), {
    json,
    fallbackError: "Naqdni qabul qilishda xatolik",
  });
  return mapCodSettleResult(raw);
}

// ─────────────────────────────────────────────────────────────────────────────
// Zonalar bo'yicha taqsimlash (2026-10-15)
// ─────────────────────────────────────────────────────────────────────────────

/** Buyurtma uchun nomzod kuryerlar — server tartibida. */
export async function fetchCourierCandidates(
  orderId: string,
  signal?: AbortSignal,
): Promise<CourierCandidates> {
  const raw = await api.get<unknown>(
    ENDPOINTS.logistOrderCourierCandidates(orderId),
    { signal, fallbackError: "Nomzod kuryerlarni yuklashda xatolik" },
  );
  return mapCourierCandidates(raw);
}

/** Avto-taqsimlash rejasi — hech narsa o'zgartirmaydi. */
export async function previewAutoAssign(
  scope: AutoAssignScope | null = null,
  orderIds: readonly string[] = [],
): Promise<AutoAssignPlan> {
  const raw = await api.post<unknown>(ENDPOINTS.logistAutoAssignPreview, {
    json: previewBody(scope, orderIds),
    fallbackError: "Taqsimlash rejasini tuzishda xatolik",
  });
  return mapAutoAssignPlan(raw);
}

/**
 * Rejani qo'llash — butunlay yoki faqat `orderIds` qismi (backend A4).
 * `409 plan_stale` — hech narsa qo'llanmagan (`staleOrderIds` bilan
 * aniqlanadi). Smenasiz kuryer rad etilmaydi — javobda `courier_off_shift`.
 */
export async function applyAutoAssign(
  planToken: string,
  plan: readonly AutoAssignPlanRow[],
  overrides: PlanOverrides,
  orderIds: readonly string[] | null = null,
): Promise<AutoAssignResult> {
  const raw = await api.post<unknown>(ENDPOINTS.logistAutoAssign, {
    json: applyBody(planToken, plan, overrides, orderIds),
    fallbackError: "Taqsimlashni qo'llashda xatolik",
  });
  return mapAutoAssignResult(raw);
}

/** Filiallararo naqd hisobot (oraliq ≤ 92 kun). */
export async function fetchInterfilialReport(
  dateFrom: string,
  dateTo: string,
  signal?: AbortSignal,
): Promise<InterfilialReport> {
  const raw = await api.get<unknown>(ENDPOINTS.codInterfilial, {
    searchParams: { date_from: dateFrom, date_to: dateTo },
    signal,
    fallbackError: "Filiallararo hisobotni yuklashda xatolik",
  });
  return mapInterfilialReport(raw);
}
