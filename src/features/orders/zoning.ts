import { asCandidateReason, asTier, tierLabel } from "@/features/couriers/candidates";
import type { CandidateReason, CandidateTier } from "@/features/couriers/candidates";
import { formatTime, parseDate } from "@/lib/format";
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

export const EMPTY_ZONING: OrderZoning = {
  district: null,
  districtDisplay: null,
  zoneId: null,
  zoneName: null,
  zoneMatch: null,
  suggestion: null,
  districtGuess: null,
  autoAssigned: null,
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

function has(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
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

/**
 * Qisqa karta (WS) — faqat **kelgan** kalitlar qo'llanadi, qolgani joyida.
 */
export function mergeZoningSnapshot(zoning: OrderZoning, raw: unknown): OrderZoning {
  if (!isRecord(raw)) return zoning;
  const next: OrderZoning = { ...zoning };
  const delivery = isRecord(raw.delivery) ? raw.delivery : null;
  if (delivery) {
    if (has(delivery, "district")) next.district = asOptionalString(delivery.district);
    if (has(delivery, "district_display")) {
      next.districtDisplay = asOptionalString(delivery.district_display);
    } else if (next.district !== zoning.district) {
      // Kod o'zgardi-yu nom kelmadi (WS qisqa kartasi) — eski nom endi
      // boshqa tumanniki; UI kodga tushadi (`withDistrictDisplay` nomlamagan).
      next.districtDisplay = null;
    }
    if (has(delivery, "zone_id")) next.zoneId = asOptionalInt(delivery.zone_id);
    if (has(delivery, "zone_name")) next.zoneName = asOptionalString(delivery.zone_name);
  }
  if (has(raw, "zone_match")) next.zoneMatch = asOptionalBool(raw.zone_match);
  if (has(raw, "assignment_suggestion")) {
    next.suggestion = mapSuggestion(raw.assignment_suggestion);
  }
  if (has(raw, "district_guess")) next.districtGuess = mapDistrictGuess(raw.district_guess);
  if (has(raw, "assigned_auto")) next.autoAssigned = asOptionalBool(raw.assigned_auto);
  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ko'rinish qoidalari (sof funksiyalar — komponentlar shu yerdan o'qiydi)
// ─────────────────────────────────────────────────────────────────────────────

/** Hudud holati — kartadagi belgi uchun bitta qiymat. */
export type ZoneState =
  /** Tuman ham, zona ham bor. */
  | "zoned"
  /** Tuman bor, lekin u hech bir zonaga kirmagan — admin qo'shishi kerak. */
  | "district_without_zone"
  /** Tuman umuman aniqlanmagan ("Hududi noma'lum" savati). */
  | "unknown";

export function zoneState(zoning: OrderZoning): ZoneState {
  if (!zoning.district) return zoning.zoneId !== null ? "zoned" : "unknown";
  return zoning.zoneId !== null ? "zoned" : "district_without_zone";
}

type SuggestionHost = {
  status: string;
  courier: { id: number } | null;
  zoning: OrderZoning;
};

/** Bir bosishda biriktiriladigan taklif — faqat tasdiqlangan, kuryersiz. */
export function actionableSuggestion(order: SuggestionHost): AssignmentSuggestion | null {
  const suggestion = order.zoning.suggestion;
  if (!suggestion || order.courier || order.status !== "confirmed") return null;
  return suggestion.courierId !== null ? suggestion : null;
}

/** "Taklif: Aziz (asosiy zona)". */
export function suggestionText(suggestion: AssignmentSuggestion): string {
  const tier = tierLabel(suggestion.tier);
  const name = suggestion.courierName || `#${suggestion.courierId ?? "—"}`;
  return tier ? `Taklif: ${name} (${tier})` : `Taklif: ${name}`;
}

/**
 * Chip sarlavhasi (hover): taklif + hisoblangan vaqt + `auto_hold` izohi —
 * server bu buyurtmani o'zi biriktirmaydi, logist qo'lda biriktiradi.
 */
export function suggestionTitle(suggestion: AssignmentSuggestion): string {
  const parts = [suggestionText(suggestion)];
  if (suggestion.computedAt) parts.push(formatTime(suggestion.computedAt));
  if (suggestion.autoHold) parts.push(AUTO_HOLD_HINT);
  return parts.join(" · ");
}

export const AUTO_HOLD_HINT = "Avto to'xtatilgan — qo'lda biriktiring";

/** Taklif yo'qligining sababi (kuryersiz buyurtma uchun izoh). */
export function suggestionMissingText(order: SuggestionHost): string | null {
  const suggestion = order.zoning.suggestion;
  if (!suggestion || order.courier || suggestion.courierId !== null) return null;
  if (suggestion.reason === "no_courier_on_shift") return "Zonada smenadagi kuryer yo'q";
  if (suggestion.reason === "no_zone") return "Zona aniqlanmagan — taklif yo'q";
  return null;
}

/** "Qo'qon shahri (70%)". */
export function districtGuessText(guess: DistrictGuess): string {
  return guess.confidence === null
    ? guess.districtDisplay
    : `${guess.districtDisplay} (${guess.confidence}%)`;
}

/** Kartadagi hudud qatori: "Qo'qon shahri · Markaz zonasi". */
export function zoningLine(zoning: OrderZoning): string | null {
  const district = zoning.districtDisplay ?? zoning.district;
  const parts = [district, zoning.zoneName].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
