import { fieldErrors } from "@/features/chief/order-action-rules";
import { ApiError, errorMessage } from "@/lib/api-client";
import { isEndpointMissing } from "@/lib/api-availability";
import { parseMoneyInput } from "@/lib/format";

/**
 * Kuryer xizmati (hujjat 83 §3): tizim hisoblamaydi — bosh kuryer yozgan
 * summa saqlanadi va «kassaga topshiriladigan naqd»dan serverda ayiriladi.
 */

/** Maydon matni → yuboriladigan summa: bo'sh yoki `0` — `null` (yozuv o'chadi). */
export function feeAmountOf(draft: string): number | null {
  const amount = parseMoneyInput(draft);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

/**
 * Saqlash xatosi — maydon ostida chiqadi: `400` da serverning maydon matni,
 * `403`/`404` da sabab; qolgani umumiy matn.
 */
export function feeErrorText(error: unknown): string {
  if (error instanceof ApiError) {
    const fields = fieldErrors(error.data, ["amount", "date", "courier_id", "note"] as const);
    const field = fields.amount ?? fields.date ?? fields.courier_id ?? fields.note;
    if (field) return field;
    if (isEndpointMissing(error)) return "Kuryer xizmatini yozish serverda hali yoqilmagan";
    if (error.code === "courier_not_found") return "Kuryer topilmadi — jadvalni yangilang";
    if (error.status === 403) return "Bu kuryer sizga biriktirilmagan";
  }
  return errorMessage(error, "Kuryer xizmatini saqlab bo'lmadi");
}
