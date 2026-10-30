import {
  ApiError,
  errorCode,
  errorFieldsRaw,
} from "@/lib/api-client";

import type { LogistOrder, PersonRef } from "./types";

/**
 * Komissiya egasi (`operator_id`) — tahrir oynasi uchun.
 *
 * Operator tavsiyasi orqali kelgan buyurtmada tarkib o'zgarsa backend
 * komissiya kimga tushishini so'raydi (`operator_id`). Logist buni o'zi
 * bilmaydi, shuning uchun qiymat buyurtmaning o'zidan olinadi — ustuvorlik
 * tartibida: tavsiya operatori → mas'ul operator → nomidan yaratilgan
 * operator → yaratgan operator → lid mas'uli. Shifokor komissiya egasi
 * emas (`02` §9.5), u ro'yxatga kirmaydi.
 *
 * Pul qulfi (2026-10-01 §5.5): logistga `operator_id` FAQAT egasi yo'q
 * buyurtmada (`created_by_operator is None`) va FAQAT tarkib qayta
 * yozilganda ruxsat — aks holda `400 field_not_allowed`. Shuning uchun u
 * faqat shu ikki shart birga bo'lganda yuboriladi. Tanlov
 * `GET /operator/logist/operators/` ro'yxatidan (filialning aktiv
 * sotuvchilari) — ro'yxatdan tashqari odam `400 operator_invalid` beradi.
 */

export type OperatorSource =
  | "recommendation"
  | "responsible"
  | "on_behalf_of"
  | "creator"
  | "lead"
  | "branch";

export type OperatorCandidate = {
  id: number;
  name: string;
  phone: string | null;
  source: OperatorSource;
};

export const OPERATOR_SOURCE_LABELS: Record<OperatorSource, string> = {
  recommendation: "tavsiya yuborgan",
  responsible: "mas'ul operator",
  on_behalf_of: "nomidan yaratilgan",
  creator: "yaratgan",
  lead: "lid mas'uli",
  branch: "filial operatori",
};

type CommissionSource = Pick<
  LogistOrder,
  | "recommendationId"
  | "recommendationOperator"
  | "responsibleOperator"
  | "onBehalfOf"
  | "createdBy"
  | "leadAssignee"
  | "source"
>;

function isStaffCreator(kind: string | null | undefined): boolean {
  return kind === "operator" || kind === "admin";
}

/** Buyurtmadan olinadigan nomzodlar — takrorsiz, ustuvorlik tartibida. */
export function operatorCandidates(
  order: CommissionSource,
): OperatorCandidate[] {
  const ordered: Array<[PersonRef | null, OperatorSource]> = [
    [order.recommendationOperator, "recommendation"],
    [order.responsibleOperator, "responsible"],
    [order.onBehalfOf, "on_behalf_of"],
    [isStaffCreator(order.createdBy?.kind) ? order.createdBy : null, "creator"],
    [order.leadAssignee, "lead"],
  ];

  const seen = new Set<number>();
  const result: OperatorCandidate[] = [];
  for (const [person, source] of ordered) {
    if (!person || person.id === null || person.id <= 0 || seen.has(person.id))
      continue;
    seen.add(person.id);
    result.push({
      id: person.id,
      name: person.name,
      phone: person.phone,
      source,
    });
  }
  return result;
}

/** Forma ochilganda tanlangan turadigan operator; topilmasa `null`. */
export function defaultCommissionOperatorId(
  order: CommissionSource,
): number | null {
  return operatorCandidates(order)[0]?.id ?? null;
}

/**
 * Buyurtma tavsiya orqali kelganmi — backend bunga `operator_id` so'raydi.
 * Maydon hali kelmasa ham, xato javobidan keyin forma o'zi talab qiladi
 * (`isOperatorRequiredError`).
 */
export function isRecommendationOrder(order: CommissionSource): boolean {
  if (order.recommendationId !== null) return true;
  if (order.recommendationOperator !== null) return true;
  return order.source.toLowerCase().includes("recommend");
}

/**
 * Buyurtmaning egasi bor — operator/admin yaratgan (`created_by_operator`).
 * Bunday buyurtmada komissiya egasi allaqachon ma'lum va logist uni
 * almashtira olmaydi: `operator_id` yuborilsa `field_not_allowed`.
 */
export function hasStaffOwner(order: Pick<LogistOrder, "createdBy">): boolean {
  return isStaffCreator(order.createdBy?.kind);
}

/** Tahrir oynasi komissiya egasini so'raydimi — tavsiya buyurtmasi va egasiz. */
export function needsCommissionOperator(order: CommissionSource): boolean {
  return isRecommendationOrder(order) && !hasStaffOwner(order);
}

/**
 * Backend xato shakli (tasdiqlangan, 2026-10-01): HTTP 400,
 * `{code, detail, fields?}`. `fields` — lug'at `{maydon: [sabablar]}`,
 * faqat sabab bo'lganda keladi. Uchala kod bir xil shaklda:
 *   operator_required → `fields.operator_id` ("Komissiya egasini ko'rsating");
 *   operator_invalid  → `fields.operator_id` ("Bu filialda bunday sotuvchi yo'q");
 *   field_not_allowed → `fields.<maydon>`; ruxsatsiz NOMA'LUM maydonda esa
 *                       `fields` yo'q, nomlar `detail` matnida.
 * Shoxlanish faqat `code` bo'yicha.
 */
export function isOperatorRequiredError(error: unknown): boolean {
  return error instanceof ApiError && errorCode(error) === "operator_required";
}

/** Tanlangan operator filial ro'yxatida yo'q (`operator_invalid`). */
export function isOperatorInvalidError(error: unknown): boolean {
  return errorCode(error) === "operator_invalid";
}

/** Logistga `operator_id` yuborish taqiqlangan (egasi bor buyurtma). */
export function isOperatorForbiddenError(error: unknown): boolean {
  if (!(error instanceof ApiError) || errorCode(error) !== "field_not_allowed")
    return false;
  return "operator_id" in errorFieldsRaw(error);
}

/** Qo'lda kiritilgan ID ni tekshiradi: musbat butun son yoki `null`. */
export function parseOperatorId(raw: string): number | null {
  const value = raw.trim();
  if (!/^\d{1,9}$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
}
