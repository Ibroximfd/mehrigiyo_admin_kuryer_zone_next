import { ApiError, errorMessage } from "@/lib/api-client";
import { asArray, asRecord, asString } from "@/lib/parse";

import type { AddressFixReason, ReturnReason } from "./types";

/**
 * «Manzilni tuzatish» va «Logistga qaytarish» qoidalari (`25_MANZIL_OZGARISHI`,
 * backend javobi 2026-10-31 «Manzil o'zgarishi»): forma tekshiruvi va server
 * xato kodlarining xaritasi — sof funksiyalar, komponent shulardan o'qiydi.
 */

export type AddressFixField = "district" | "address_text" | "landmark" | "reason" | "note";
export type ReturnField = "reason" | "note";
export type FieldErrors<F extends string> = Partial<Record<F, string>>;

/**
 * Server xatosi turi:
 *   • `foreign_region` — `403 zone_other_region` (tuman o'z viloyatlaridan emas);
 *   • `closed` — `409 order_closed` (yetkazilgan yoki bekor qilingan);
 *   • `gone` — zakaz endi bosh kuryerda emas (`404`, masalan logistga qaytarilgan);
 *   • `validation` — `400 validation_error`, maydonlar `fields` da;
 *   • `missing` — endpoint hali chiqmagan.
 */
export type ChiefActionFailureKind = "foreign_region" | "closed" | "gone" | "validation" | "missing" | "other";

export type ChiefActionFailure<F extends string> = {
  kind: ChiefActionFailureKind;
  message: string;
  fields: FieldErrors<F>;
};

const MESSAGES: Record<Exclude<ChiefActionFailureKind, "other" | "validation">, string> = {
  foreign_region: "Tuman o'z viloyatlaringizdan bo'lishi kerak",
  closed: "Zakaz yopilgan (yetkazilgan yoki bekor qilingan) — o'zgartirib bo'lmaydi",
  gone: "Zakaz endi sizda emas — ro'yxat yangilandi",
  missing: "Bu amal backendda hali yo'q — backend kutilmoqda",
};

/** `fields{}` — `{maydon: "matn"}` yoki DRF shaklidagi `{maydon: ["matn"]}`; faqat ma'lum maydonlar olinadi. */
function fieldErrors<F extends string>(data: unknown, known: readonly F[]): FieldErrors<F> {
  const json = asRecord(data);
  const source = asRecord(json.fields);
  const result: FieldErrors<F> = {};
  for (const field of known) {
    const value = source[field] ?? json[field];
    const text = Array.isArray(value) ? asString(asArray(value)[0]) : asString(value);
    if (text.trim()) result[field] = text.trim();
  }
  return result;
}

function failureKind(error: unknown): ChiefActionFailureKind {
  if (!(error instanceof ApiError)) return "other";
  if (error.code === "endpoint_missing") return "missing";
  if (error.code === "zone_other_region") return "foreign_region";
  if (error.code === "order_closed" || error.status === 409) return "closed";
  if (error.code === "order_gone" || error.code === "order_not_found" || error.status === 404) return "gone";
  if (error.code === "validation_error" || error.status === 400) return "validation";
  return "other";
}

export function chiefActionFailure<F extends string>(
  error: unknown,
  known: readonly F[],
  fallback: string,
): ChiefActionFailure<F> {
  const kind = failureKind(error);
  if (kind === "validation") {
    const fields = fieldErrors(error instanceof ApiError ? error.data : null, known);
    // Maydon xatosi forma ostida chiqadi; umumiy matn — faqat maydonsiz xato uchun.
    const message = Object.keys(fields).length > 0 ? "Maydonlarni tekshiring" : errorMessage(error, fallback);
    return { kind, message, fields };
  }
  if (kind === "other") return { kind, message: errorMessage(error, fallback), fields: {} };
  return { kind, message: MESSAGES[kind], fields: {} };
}

export const ADDRESS_FIX_FIELDS: readonly AddressFixField[] = ["district", "address_text", "landmark", "reason", "note"];
export const RETURN_FIELDS: readonly ReturnField[] = ["reason", "note"];

/** Manzil tuzatish formasi: tuman — tanlangan viloyat ro'yxatidan, sabab — majburiy. */
export function addressFixErrors(
  input: { district: string; reason: AddressFixReason | ""; note: string },
  districtCodes: readonly string[],
): FieldErrors<AddressFixField> {
  const errors: FieldErrors<AddressFixField> = {};
  if (!input.district || !districtCodes.includes(input.district)) errors.district = "Tumanni tanlang";
  if (!input.reason) errors.reason = "Sababni tanlang";
  if (input.reason === "other" && !input.note.trim()) errors.note = "«Boshqa sabab» uchun izoh yozing";
  return errors;
}

/** Logistga qaytarish: `other` da izoh majburiy (backend ham `400 fields.note` beradi). */
export function returnErrors(input: { reason: ReturnReason | ""; note: string }): FieldErrors<ReturnField> {
  const errors: FieldErrors<ReturnField> = {};
  if (!input.reason) errors.reason = "Sababni tanlang";
  if (input.reason === "other" && !input.note.trim()) errors.note = "«Boshqa sabab» uchun izoh yozing";
  return errors;
}

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}

/**
 * Manzil tuzatilgach kuryer olindimi: yangi zonada kuryer bo'lmasa backend uni
 * oladi va zakaz «Kelganlar» ga qaytadi — foydalanuvchiga aytiladi.
 */
export function courierWasUnassigned(before: { courier: unknown | null }, after: { courier: unknown | null }): boolean {
  return before.courier !== null && after.courier === null;
}
