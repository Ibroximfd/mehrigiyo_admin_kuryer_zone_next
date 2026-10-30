import { parseDate } from "@/lib/format";
import { asOptionalBool, asOptionalString, asRecord, isRecord } from "@/lib/parse";

/**
 * Manzil geokodi (backend javobi 2026-10-16, B4): Google Geocoding
 * natijasi buyurtmaning `delivery` blokida keladi —
 *
 *   • to'liq blok `delivery.geocode {status, precision, address_issue,
 *     place_id, geocoded_at}`;
 *   • yassi zaxira `delivery.geocode_status` / `geocode_precision` /
 *     `address_issue` (eski serializer);
 *   • buyurtma darajasida `needs_review` — "manzilni aniqlashtiring".
 *
 * Eski buyurtmalarda hammasi `null`/`pending` — UI belgi chizmaydi.
 */

export type GeocodeStatus = "ok" | "failed" | "pending" | "expired";

export type GeocodePrecision =
  | "ROOFTOP"
  | "RANGE_INTERPOLATED"
  | "GEOMETRIC_CENTER"
  | "APPROXIMATE";

export type AddressIssue = "imprecise" | "outside_district";

export type OrderGeocode = {
  status: GeocodeStatus | null;
  precision: GeocodePrecision | null;
  addressIssue: AddressIssue | null;
  placeId: string | null;
  geocodedAt: Date | null;
};

const STATUSES: ReadonlySet<string> = new Set(["ok", "failed", "pending", "expired"]);
const PRECISIONS: ReadonlySet<string> = new Set([
  "ROOFTOP",
  "RANGE_INTERPOLATED",
  "GEOMETRIC_CENTER",
  "APPROXIMATE",
]);

export function asGeocodeStatus(raw: unknown): GeocodeStatus | null {
  const text = asOptionalString(raw)?.toLowerCase() ?? null;
  return text && STATUSES.has(text) ? (text as GeocodeStatus) : null;
}

export function asGeocodePrecision(raw: unknown): GeocodePrecision | null {
  const text = asOptionalString(raw)?.toUpperCase() ?? null;
  return text && PRECISIONS.has(text) ? (text as GeocodePrecision) : null;
}

export function asAddressIssue(raw: unknown): AddressIssue | null {
  const text = asOptionalString(raw)?.toLowerCase() ?? null;
  return text === "imprecise" || text === "outside_district" ? text : null;
}

/**
 * `delivery` blokidan geokodni o'qish. Blok ham, yassi maydonlar ham
 * bo'lmasa `null` — "backend hali bermaydi" bilan "kutilmoqda" aralashmasin.
 */
export function mapOrderGeocode(delivery: unknown): OrderGeocode | null {
  const json = asRecord(delivery);
  const block = isRecord(json.geocode) ? json.geocode : null;
  const geocode: OrderGeocode = {
    status: asGeocodeStatus(block?.status ?? json.geocode_status),
    precision: asGeocodePrecision(block?.precision ?? json.geocode_precision),
    addressIssue: asAddressIssue(block?.address_issue ?? json.address_issue),
    placeId: asOptionalString(block?.place_id ?? json.place_id),
    geocodedAt: parseDate(block?.geocoded_at ?? json.geocoded_at),
  };
  return Object.values(geocode).some((value) => value !== null) ? geocode : null;
}

/** Buyurtma darajasidagi `needs_review`; yo'q bo'lsa `null`. */
export function mapNeedsReview(json: Record<string, unknown>): boolean | null {
  return asOptionalBool(json.needs_review);
}

/** Kartochka/qator/detal belgisi uchun qaror. */
export type AddressIssueKind = "imprecise" | "outside_district" | "pending";

export type AddressIssueBadge = {
  kind: AddressIssueKind;
  label: string;
  /** Tooltip — nima bo'lgani va logist nima qilishi. */
  hint: string;
};

const BADGES: Record<AddressIssueKind, AddressIssueBadge> = {
  imprecise: {
    kind: "imprecise",
    label: "Manzil taxminiy",
    hint: "Geokod manzilni faqat taxminan topdi (ko'cha yoki mahalla markazi). Kuryer adashmasin — manzilni aniqlashtiring.",
  },
  outside_district: {
    kind: "outside_district",
    label: "Tumandan tashqarida",
    hint: "Topilgan nuqta buyurtma tumani chegarasidan tashqarida. Manzil yoki tuman xato bo'lishi mumkin.",
  },
  pending: {
    kind: "pending",
    label: "Geokod kutilmoqda",
    hint: "Manzil hali xaritada aniqlanmagan — server fonda qayta urinadi.",
  },
};

export type GeocodeFacts = {
  geocode: OrderGeocode | null;
  needsReview: boolean | null;
};

/**
 * Qaysi belgi chiqishi:
 *   1. `address_issue` aniq bo'lsa — o'sha (tumandan tashqari ustun);
 *   2. `needs_review` bo'lib sabab kelmasa — "taxminiy" (server shu
 *      ma'noda qo'yadi);
 *   3. `pending` — kutilmoqda; `ok`/`failed`/`expired`/`null` — belgisiz
 *      (`failed` da manzil matni baribir bor, kuryer o'zi topadi; alohida
 *      qo'rqitmaymiz).
 */
export function addressIssueBadge(order: GeocodeFacts): AddressIssueBadge | null {
  const geocode = order.geocode;
  if (geocode?.addressIssue) return BADGES[geocode.addressIssue];
  if (order.needsReview === true) return BADGES.imprecise;
  if (geocode?.status === "pending") return BADGES.pending;
  return null;
}

/** "Manzil muammosi" filtri: aniqlashtirish kerak bo'lgan buyurtmalar. */
export function hasGeocodeIssue(order: GeocodeFacts): boolean {
  const badge = addressIssueBadge(order);
  return badge !== null && badge.kind !== "pending";
}

/** Detal: "Manzilni aniqlashtiring" ko'rsatish kerakmi. */
export function needsAddressReview(order: GeocodeFacts): boolean {
  return hasGeocodeIssue(order);
}

export const PRECISION_LABELS: Record<GeocodePrecision, string> = {
  ROOFTOP: "aniq (bino)",
  RANGE_INTERPOLATED: "ko'cha bo'yicha",
  GEOMETRIC_CENTER: "markaz (taxminiy)",
  APPROXIMATE: "taxminiy",
};

/** Detal uchun bir qatorlik izoh: "Google · ko'cha bo'yicha · 12.10 14:05". */
export function geocodePrecisionLabel(precision: GeocodePrecision | null): string | null {
  return precision ? PRECISION_LABELS[precision] : null;
}
