import { isEndpointMissing } from "@/lib/api-availability";
import { ApiError } from "@/lib/api-client";
import { asArray, asInt, asOptionalString, asRecord, asString, isRecord } from "@/lib/parse";

/** Zakazlar soni (hujjat 69 §3): `orders` = kuryersiz + kuryerda + yetkazilgan. */
export type OrderCounts = {
  orders: number;
  incoming: number;
  withCourier: number;
  delivered: number;
};

export type AreaStats = OrderCounts & { districts: Map<string, OrderCounts> };

export type ZoneStats = {
  total: OrderCounts;
  zones: Map<number, AreaStats>;
  unzoned: AreaStats;
  noDistrict: number;
};

export const EMPTY_COUNTS: OrderCounts = { orders: 0, incoming: 0, withCourier: 0, delivered: 0 };

function mapCounts(raw: unknown): OrderCounts {
  const json = asRecord(raw);
  return {
    orders: asInt(json.orders),
    incoming: asInt(json.incoming),
    withCourier: asInt(json.with_courier),
    delivered: asInt(json.delivered),
  };
}

function mapArea(raw: unknown): AreaStats {
  const districts = new Map<string, OrderCounts>();
  for (const row of asArray(asRecord(raw).districts)) {
    if (!isRecord(row)) continue;
    const code = asString(row.code);
    if (code) districts.set(code, mapCounts(row));
  }
  return { ...mapCounts(raw), districts };
}

export function mapZoneStats(raw: unknown): ZoneStats {
  const json = asRecord(raw);
  const zones = new Map<number, AreaStats>();
  for (const row of asArray(json.zones)) {
    if (isRecord(row)) zones.set(asInt(row.id), mapArea(row));
  }
  return {
    total: mapCounts(json.total),
    zones,
    unzoned: mapArea(json.unzoned),
    noDistrict: asInt(asRecord(json.no_district).orders),
  };
}

/** Ulush (0–1) — tuman satridagi chiziq uchun; bo'linuvchi 0 bo'lsa 0. */
export function shareOf(part: number, whole: number): number {
  return whole > 0 ? Math.min(1, Math.max(0, part / whole)) : 0;
}

/** `409 zone_has_orders` — zonada faol zakaz bor (hujjat 69 §2). */
export type ZoneBusy = { count: number; numbers: string[] };

export function zoneBusyOf(error: unknown): ZoneBusy | null {
  if (!(error instanceof ApiError) || error.code !== "zone_has_orders") return null;
  const json = asRecord(error.data);
  return {
    count: asInt(json.orders_count),
    numbers: asArray(json.order_numbers)
      .map((item) => asOptionalString(item))
      .filter((item): item is string => item !== null)
      .slice(0, 10),
  };
}

/** `409 district_taken` — tuman boshqa bosh kuryer zonasida (hujjat 69 §1). */
export function takenDistrictsOf(error: unknown): Array<{ district: string; zoneName: string; chiefName: string }> {
  if (!(error instanceof ApiError) || error.code !== "district_taken") return [];
  return asArray(asRecord(error.data).taken)
    .filter(isRecord)
    .map((row) => ({
      district: asString(row.district),
      zoneName: asString(row.zone_name),
      chiefName: asString(row.chief_name),
    }));
}

/**
 * Backend bu imkoniyatni hali chiqarmagan: marshrut yo'q (`404` kodsiz →
 * `endpoint_missing`) yoki metod yo'q (`405`, masalan `DELETE`). UI bo'limni
 * yiqitmaydi — chizmaydi yoki «tez orada» deydi.
 */
export function isNotReady(error: unknown): boolean {
  return (
    isEndpointMissing(error) ||
    (error instanceof ApiError && (error.code === "endpoint_missing" || error.status === 405))
  );
}
