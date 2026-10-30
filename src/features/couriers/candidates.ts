import { mapZoneRef, asIdList } from "@/features/zones/types";
import type { ZoneRef } from "@/features/zones/types";
import { parseDate } from "@/lib/format";
import {
  asArray,
  asBool,
  asInt,
  asOptionalInt,
  asOptionalNumber,
  asOptionalString,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";

/**
 * Buyurtma uchun kuryer nomzodlari
 * (`GET /operator/logist/orders/{id}/courier-candidates/`).
 *
 * Tartib — serverniki (zona, yuklama, masofa, tanishlik hisobga olingan);
 * klient faqat guruhlaydi, qayta saralamaydi.
 */

export type CandidateTier = "primary" | "secondary" | "neighbor" | "region";

const TIERS: readonly CandidateTier[] = ["primary", "secondary", "neighbor", "region"];

export function asTier(value: unknown): CandidateTier | null {
  const text = asString(value);
  return (TIERS as readonly string[]).includes(text) ? (text as CandidateTier) : null;
}

/** Zona darajasining qisqa nomi — chip va izohlarda. */
export const TIER_LABELS: Record<CandidateTier, string> = {
  primary: "asosiy zona",
  secondary: "ikkinchi zona",
  neighbor: "qo'shni zona",
  region: "viloyat",
};

export function tierLabel(tier: CandidateTier | null): string {
  return tier ? TIER_LABELS[tier] : "";
}

export type CandidateReason = "ok" | "no_zone" | "no_courier_on_shift";

export function asCandidateReason(value: unknown): CandidateReason | null {
  const text = asString(value);
  return text === "ok" || text === "no_zone" || text === "no_courier_on_shift"
    ? text
    : null;
}

export type CourierCandidate = {
  courier: {
    id: number;
    fullName: string;
    phone: string | null;
    zoneIds: number[];
    onShift: boolean;
    online: boolean;
    lastSeenAt: Date | null;
    lastLocation: { lat: number; lng: number } | null;
  };
  tier: CandidateTier;
  /** Ochiq buyurtmalar soni (barcha filiallar). */
  load: number;
  /** Buyurtmagacha masofa (metr); joylashuv bo'lmasa `null`. */
  distanceM: number | null;
  /** Shu manzilga ilgari borganmi. */
  familiar: boolean;
  /** Server taklif qilgan kuryer. */
  suggested: boolean;
};

export type CourierCandidates = {
  orderId: string;
  zone: ZoneRef | null;
  candidates: CourierCandidate[];
  suggestedCourierId: number | null;
  reason: CandidateReason | null;
};

function mapLocation(raw: unknown): { lat: number; lng: number } | null {
  if (!isRecord(raw)) return null;
  const lat = asOptionalNumber(raw.lat);
  const lng = asOptionalNumber(raw.lng);
  return lat === null || lng === null ? null : { lat, lng };
}

function mapCandidate(raw: unknown): CourierCandidate | null {
  if (!isRecord(raw)) return null;
  const courier = asRecord(raw.courier);
  const id = asOptionalInt(courier.id);
  if (id === null) return null;
  return {
    courier: {
      id,
      fullName: asString(courier.full_name ?? courier.name),
      phone: asOptionalString(courier.phone),
      zoneIds: asIdList(courier.zone_ids),
      onShift: asBool(courier.on_shift),
      online: asBool(courier.online),
      lastSeenAt: parseDate(asOptionalString(courier.last_seen_at)),
      lastLocation: mapLocation(courier.last_location),
    },
    // Notanish daraja — eng keng guruhga ("Viloyat").
    tier: asTier(raw.tier) ?? "region",
    load: asInt(raw.load),
    distanceM: asOptionalNumber(raw.distance_m),
    familiar: asBool(raw.familiar),
    suggested: asBool(raw.suggested),
  };
}

export function mapCourierCandidates(raw: unknown): CourierCandidates {
  const json = asRecord(raw);
  const candidates = asArray(json.candidates)
    .map(mapCandidate)
    .filter((item): item is CourierCandidate => item !== null);
  const suggestedCourierId = asOptionalInt(json.suggested_courier_id);
  return {
    orderId: asString(json.order_id),
    zone: mapZoneRef(json.zone),
    // `suggested` bayrog'i yo'q eski javobda — umumiy id dan.
    candidates: candidates.map((item) =>
      item.suggested || item.courier.id !== suggestedCourierId
        ? item
        : { ...item, suggested: true },
    ),
    suggestedCourierId,
    reason: asCandidateReason(json.reason),
  };
}

export type CandidateGroupKey = "zone" | "neighbor" | "region";

export type CandidateGroup = {
  key: CandidateGroupKey;
  title: string;
  items: CourierCandidate[];
};

const GROUP_TITLES: Record<CandidateGroupKey, string> = {
  zone: "Zona kuryerlari",
  neighbor: "Qo'shni zona",
  region: "Viloyat",
};

function groupOf(tier: CandidateTier): CandidateGroupKey {
  if (tier === "primary" || tier === "secondary") return "zone";
  return tier;
}

/**
 * Guruhlash: "Zona kuryerlari" (primary + secondary) → "Qo'shni zona" →
 * "Viloyat". Har guruh ichida server tartibi saqlanadi; bo'sh guruh chiqmaydi.
 */
export function groupCandidates(candidates: readonly CourierCandidate[]): CandidateGroup[] {
  const order: CandidateGroupKey[] = ["zone", "neighbor", "region"];
  return order
    .map((key) => ({
      key,
      title: GROUP_TITLES[key],
      items: candidates.filter((item) => groupOf(item.tier) === key),
    }))
    .filter((group) => group.items.length > 0);
}

/** Nomzodlar bo'sh yoki taklif yo'qligi sababi — logistga bitta jumla. */
export function candidateReasonText(reason: CandidateReason | null): string | null {
  if (reason === "no_zone") {
    return "Buyurtma zonasi aniqlanmagan — viloyat kuryerlari ko'rsatilmoqda";
  }
  if (reason === "no_courier_on_shift") return "Zonada smenadagi kuryer yo'q";
  return null;
}

/** `1 200 m` → "1,2 km"; 1 km dan kam — metrda. */
export function formatDistance(meters: number | null): string | null {
  if (meters === null || meters < 0) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0).replace(".", ",")} km`;
}
