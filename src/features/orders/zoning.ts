import { asCandidateReason, asTier } from "@/features/couriers/candidates";
import type { CandidateReason, CandidateTier } from "@/features/couriers/candidates";
import { parseDate } from "@/lib/format";
import {
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
 *   • `district_guess` — manzil/GPS dan taxmin qilingan tuman.
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

export type DistrictGuess = {
  district: string;
  districtDisplay: string;
  /** Foiz (0–100); server `0–1` beradi, bermasa `null`. */
  confidence: number | null;
};

export type OrderZoning = {
  district: string | null;
  districtDisplay: string | null;
  zoneId: number | null;
  zoneName: string | null;
  zoneMatch: boolean | null;
  suggestion: AssignmentSuggestion | null;
  districtGuess: DistrictGuess | null;
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

export function mapDistrictGuess(raw: unknown): DistrictGuess | null {
  if (!isRecord(raw)) return null;
  const district = asOptionalString(raw.district);
  if (!district) return null;
  return {
    district,
    districtDisplay: asOptionalString(raw.district_display) ?? district,
    confidence: confidencePercent(raw.confidence),
  };
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
    districtGuess: mapDistrictGuess(json.district_guess),
    autoAssigned: asOptionalBool(json.assigned_auto),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Ko'rinish qoidalari (sof funksiyalar — komponentlar shu yerdan o'qiydi)
// ─────────────────────────────────────────────────────────────────────────────

