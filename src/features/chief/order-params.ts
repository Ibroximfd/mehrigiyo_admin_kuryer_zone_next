import type { QueryValue } from "@/lib/api-client";

import type { ChiefOrderScope } from "./types";
import type { DistrictFilter } from "./order-sort";

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
  productIds?: readonly number[];
  productMatch?: "any" | "all";
  amountMin?: number | null;
  amountMax?: number | null;
  ordering?: string | null;
  districtFilter?: DistrictFilter | null;
};

export type ChiefOrdersQuery = ChiefOrderFilters & {
  scope: ChiefOrderScope;
  page?: number;
};

/**
 * Server filtrlari (K1 §2.2 + V3): `scope`, `status`, `courier_id`, sana,
 * `q` (raqam, mijoz, telefon, manzil, mahsulot), `zone_id`, `filial_id`,
 * `region`, `district`, `page`. «Yetkazilgan» — `scope=all&status=delivered`.
 * 60-javob (prod, 6/6): mahsulot, summa, `ordering`, `date_field`, `has_zone`,
 * `district_state` — hammasi serverda; sayt o'zi saralamaydi.
 * Sana: «Yetkazilgan» da yetkazilgan kuni, boshqalarida bosh kuryerga kelgan kuni.
 */
export function orderFilterParams(query: ChiefOrdersQuery): Record<string, QueryValue> {
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
    date_field: query.from || query.to ? (query.scope === "delivered" ? "delivered" : "arrived") : null,
    product_ids: query.productIds?.length ? query.productIds.join(",") : null,
    product_match: query.productIds?.length && query.productMatch === "all" ? "all" : null,
    amount_min: query.amountMin ?? null,
    amount_max: query.amountMax ?? null,
    ordering: query.ordering ?? null,
    has_zone: query.districtFilter === "no_zone" ? "false" : null,
    district_state: query.districtFilter && query.districtFilter !== "no_zone" ? query.districtFilter : null,
  };
}

/**
 * Taqsimlash so'roviga `filters` (hujjat 68): ro'yxat so'rovidagi AYNAN o'sha
 * parametrlar — ekranda ko'ringan va beriladigan zakazlar bir xil bo'lsin.
 * Ro'yxatga xos kalitlar (`scope`, `status`, `ordering`, kuryer) va bo'shlar tashlanadi.
 */
export type DispatchFilters = Record<string, string | number | boolean>;

const LIST_ONLY_KEYS = new Set(["scope", "status", "ordering", "courier_id"]);

export function dispatchFilters(filters: ChiefOrderFilters): DispatchFilters {
  const params = orderFilterParams({ ...filters, scope: "incoming" });
  const result: DispatchFilters = {};
  for (const [key, value] of Object.entries(params)) {
    if (LIST_ONLY_KEYS.has(key) || value === null || value === undefined || value === "") continue;
    result[key] = value;
  }
  return result;
}
