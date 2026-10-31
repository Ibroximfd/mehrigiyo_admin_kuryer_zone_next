import { parseDate } from "@/lib/format";
import { toLatLng } from "@/lib/maps";
import type { LatLng } from "@/lib/maps";
import {
  asArray,
  asOptionalNumber,
  asOptionalString,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";

/**
 * Kuryer marshrut rejasi (backend javobi 2026-10-16, B3): kuryer ilovasi
 * `PUT /courier/route/` bilan tasdiqlagan tartib. Logist kartasida
 * `route_plan` (yoki `null`) — 48 soat saqlanadi.
 *
 *   {order_ids, planned_from {lat, lng, at}, total_distance_m, eta_s,
 *    reason, source?, created_at}
 *
 * Eski javobda `null` — karta qatorni chizmaydi.
 */

export type RoutePlanReason = "auto" | "manual" | "reroute";

export type RouteSource = "road" | "estimate";

export type RoutePlan = {
  orderIds: string[];
  plannedFrom: (LatLng & { at: Date | null }) | null;
  totalDistanceM: number | null;
  etaS: number | null;
  reason: RoutePlanReason | null;
  /** OSRM yo'l bo'yicha yoki to'g'ri chiziq taxmini; server bermasa `null`. */
  source: RouteSource | null;
  createdAt: Date | null;
};

/**
 * Sabab qiymatlari server tomonidan erkin satr (`reason?`): ilova
 * yuboradigan `auto` / `manual` / `reroute` (va sinonimlari) tanilarsa
 * yorliq chiqadi, tanilmasa `null` — notanish kalit ekranga tushmaydi.
 */
export function asRoutePlanReason(raw: unknown): RoutePlanReason | null {
  const text = asOptionalString(raw)?.toLowerCase().replace(/[-_\s]/g, "") ?? null;
  if (!text) return null;
  if (text === "auto" || text === "automatic" || text === "optimize" || text === "optimized") {
    return "auto";
  }
  if (text === "manual" || text === "hand" || text === "courier") return "manual";
  if (
    text === "reroute" ||
    text === "rerouted" ||
    text === "reoptimize" ||
    text === "reoptimized" ||
    text === "replan" ||
    text === "retry"
  ) {
    return "reroute";
  }
  return null;
}

export function asRouteSource(raw: unknown): RouteSource | null {
  const text = asOptionalString(raw)?.toLowerCase() ?? null;
  return text === "road" || text === "estimate" ? text : null;
}

export function mapRoutePlan(raw: unknown): RoutePlan | null {
  if (!isRecord(raw)) return null;
  const from = asRecord(raw.planned_from);
  const fromPoint = toLatLng(asOptionalNumber(from.lat), asOptionalNumber(from.lng));
  const plan: RoutePlan = {
    orderIds: asArray(raw.order_ids)
      .map((id) => asString(id).trim())
      .filter((id) => id.length > 0),
    plannedFrom: fromPoint ? { ...fromPoint, at: parseDate(from.at) } : null,
    totalDistanceM: nonNegative(asOptionalNumber(raw.total_distance_m)),
    etaS: nonNegative(asOptionalNumber(raw.eta_s ?? raw.total_eta_s)),
    reason: asRoutePlanReason(raw.reason),
    source: asRouteSource(raw.source),
    createdAt: parseDate(raw.created_at),
  };
  // Bo'sh obyekt (`{}`) — reja yo'q.
  const empty =
    plan.orderIds.length === 0 &&
    plan.totalDistanceM === null &&
    plan.etaS === null &&
    plan.createdAt === null;
  return empty ? null : plan;
}

function nonNegative(value: number | null): number | null {
  return value !== null && value >= 0 ? value : null;
}
