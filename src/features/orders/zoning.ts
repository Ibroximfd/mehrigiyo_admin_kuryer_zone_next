import { asCandidateReason, asTier } from "@/features/couriers/candidates";
import type { CandidateReason, CandidateTier } from "@/features/couriers/candidates";
import { parseDate } from "@/lib/format";
import {
  asArray,
  asOptionalBool,
  asOptionalInt,
  asOptionalNumber,
  asOptionalString,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";

/**
 * Buyurtmaning hududi va taqsimlash holati (2026-10-15 kontrakti).
 *
 *   • `delivery.district` / `district_display` — tuman;
 *   • `delivery.zone_id` / `zone_name` — tumandan server hisoblagan zona;
 *   • `zone_match` — biriktirilgan kuryer shu zonadanmi (`null` — kuryer
 *     yo'q yoki hisoblanmagan);
 *   • `assignment_suggestion` — taklif (faqat tasdiqlangan + kuryersiz);
 *   • `district_guess` — manzil/GPS dan taxmin qilingan tuman;
 *   • `district_state` (60-javob) — tuman qanday qo'yilgan: `set` (qo'lda /
 *     manzildan / GPS), `auto` (matndan ishonchli aniqlanib yozilgan),
 *     `guess` (taxmin bor, YOZILMAGAN — bosh kuryer tasdiqlaydi),
 *     `missing` (topilmadi — tanlanadi).
 *
 * Eski javobda hammasi `null` — UI belgilarni shunchaki ko'rsatmaydi.
 */

export type AssignmentSuggestion = {
  courierId: number | null;
  courierName: string;
  tier: CandidateTier | null;
  reason: CandidateReason | null;
  computedAt: Date | null;
  /** Avto-biriktirish to'xtatilgan — faqat taklif, o'zi biriktirmaydi. */
  autoHold: boolean;
};

export type DistrictOption = { district: string; districtDisplay: string };

export type DistrictGuess = DistrictOption & {
  /** Foiz (0–100); server `0–1` beradi, bermasa `null`. */
  confidence: number | null;
  /** Ikki ma'noli taxminda boshqa variantlar (`alternatives[]`, 60-javob). */
  alternatives: DistrictOption[];
};

export const DISTRICT_STATES = ["set", "auto", "guess", "missing"] as const;
export type DistrictState = (typeof DISTRICT_STATES)[number];

export function asDistrictState(value: unknown): DistrictState | null {
  return DISTRICT_STATES.find((state) => state === value) ?? null;
}

export type OrderZoning = {
  district: string | null;
  districtDisplay: string | null;
  zoneId: number | null;
  zoneName: string | null;
  zoneMatch: boolean | null;
  suggestion: AssignmentSuggestion | null;
  districtGuess: DistrictGuess | null;
  /** Eski javobda `null` — belgi chizilmaydi. */
  districtState: DistrictState | null;
  /**
   * Karta `assigned_auto`: oxirgi biriktirish server tomonidanmi (`full`
   * rejim yoki avto reja). Qo'lda/override → `false`; eski javob → `null`.
   */
  autoAssigned: boolean | null;
};

export function mapSuggestion(raw: unknown): AssignmentSuggestion | null {
  if (!isRecord(raw)) return null;
  return {
    courierId: asOptionalInt(raw.courier_id),
    courierName: asString(raw.courier_name),
    tier: asTier(raw.tier),
    reason: asCandidateReason(raw.reason),
    computedAt: parseDate(asOptionalString(raw.computed_at)),
    autoHold: raw.auto_hold === true,
  };
}

/** Server ishonchi `0–1` (backend javobi #13) — foizga keltiriladi. */
export function confidencePercent(value: unknown): number | null {
  const number = asOptionalNumber(value);
  if (number === null || number < 0 || number > 1) return null;
  return Math.round(number * 100);
}

/** Variant obyekt (`{district, district_display}`) yoki shunchaki kod qatori bo'lishi mumkin. */
function mapDistrictOption(raw: unknown): DistrictOption | null {
  if (typeof raw === "string") return raw.trim() ? { district: raw.trim(), districtDisplay: raw.trim() } : null;
  if (!isRecord(raw)) return null;
  const district = asOptionalString(raw.district ?? raw.code);
  if (!district) return null;
  return { district, districtDisplay: asOptionalString(raw.district_display ?? raw.name) ?? district };
}

export function mapDistrictGuess(raw: unknown): DistrictGuess | null {
  const option = mapDistrictOption(raw);
  if (!option || !isRecord(raw)) return null;
  const alternatives = asArray(raw.alternatives)
    .map(mapDistrictOption)
    .filter((item): item is DistrictOption => item !== null && item.district !== option.district);
  return { ...option, confidence: confidencePercent(raw.confidence), alternatives };
}

/** To'liq buyurtma javobidan (REST yoki WS dagi to'liq karta). */
export function mapOrderZoning(raw: unknown): OrderZoning {
  const json = asRecord(raw);
  const delivery = asRecord(json.delivery);
  return {
    district: asOptionalString(delivery.district ?? json.district),
    districtDisplay: asOptionalString(
      delivery.district_display ?? json.district_display,
    ),
    zoneId: asOptionalInt(delivery.zone_id ?? json.zone_id),
    zoneName: asOptionalString(delivery.zone_name ?? json.zone_name),
    zoneMatch: asOptionalBool(json.zone_match),
    suggestion: mapSuggestion(json.assignment_suggestion),
    districtGuess: mapDistrictGuess(json.district_guess ?? delivery.district_guess),
    districtState: asDistrictState(json.district_state ?? delivery.district_state),
    autoAssigned: asOptionalBool(json.assigned_auto),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Ko'rinish qoidalari (sof funksiyalar — komponentlar shu yerdan o'qiydi)
// ─────────────────────────────────────────────────────────────────────────────

