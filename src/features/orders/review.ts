import { parseDate } from "@/lib/format";
import { asBool, asOptionalInt, asString } from "@/lib/parse";

/**
 * «Jarayonda» — kuryer yoki operator natija so'ragan, logist hali
 * yakunlamagan zakaz (backend 2026-10-30 §A).
 *
 * Alohida status EMAS: `status == "shipping"` va `courier_outcome != "none"`,
 * yoki `pending`/`confirmed` + `courier_outcome == "refused"` (operator
 * atkazi, `OPERATOR_CANCEL_NEEDS_LOGIST_REVIEW` bayrog'i ostida).
 * Maydon kelmasa (eski backend) `shipping` + kuryer bosqichi «yetkazildi»
 * ham jarayon hisoblanadi — kuryer ilovasi bilan bir xil qoida.
 */
export type CourierOutcome = "none" | "delivered" | "refused";
export type OutcomeSource = "" | "courier" | "operator" | "logist";

export type OrderReview = {
  outcome: CourierOutcome;
  source: OutcomeSource;
  requestedAt: Date | null;
  /** Logist yakunlaganda yozilgan manzil soni; yakunlanmagan — `null`. */
  courierAddresses: number | null;
  /** Logist sukutdan farqli son yuborganmi. */
  courierAddressesManual: boolean;
  /** Logist yakunlagan payt (manzil sanasi shu kun). */
  finalizedAt: Date | null;
};

export function mapOrderReview(json: Record<string, unknown>): OrderReview {
  const outcome = asString(json.courier_outcome);
  const source = asString(json.outcome_source);
  return {
    outcome: outcome === "delivered" || outcome === "refused" ? outcome : "none",
    source: source === "courier" || source === "operator" || source === "logist" ? source : "",
    requestedAt: parseDate(json.outcome_requested_at),
    courierAddresses: asOptionalInt(json.courier_addresses),
    courierAddressesManual: asBool(json.courier_addresses_manual),
    finalizedAt: parseDate(json.finalized_at),
  };
}

type ReviewFacts = {
  status: string;
  review: Pick<OrderReview, "outcome">;
  deliveryStage: string | null;
};

/** Zakaz «Jarayonda» — logist yakunlashi kerak. */
export function isInReview(order: ReviewFacts): boolean {
  const outcome = order.review.outcome;
  if (order.status === "shipping") return outcome !== "none" || order.deliveryStage === "delivered";
  if (order.status === "pending" || order.status === "confirmed") return outcome === "refused";
  return false;
}

/** Natija kuryerning «yetkazdim» i (yoki eski backendda bosqich «yetkazildi»). */
export function reportedDelivered(order: ReviewFacts): boolean {
  return order.review.outcome === "delivered" || (order.review.outcome === "none" && order.deliveryStage === "delivered");
}

/** Kartadagi qisqa yozuv: kim nima so'radi. */
export function reviewLabel(order: ReviewFacts & { review: Pick<OrderReview, "source"> }): string {
  if (reportedDelivered(order)) return "Kuryer: yetkazdim";
  if (order.review.source === "operator") return "Operator: atkaz";
  return "Kuryer: qaytaraman";
}
