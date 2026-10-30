import { ApiError, errorMessage } from "@/lib/api-client";

import { mapShortages, type Shortage } from "./types";

/**
 * Sklad xato kodlari (§2.1, §18) → odam o'qiydigan matn. `insufficient_stock`
 * alohida: unda jadval (nima, qancha yetmaydi) ko'rsatiladi, toast emas.
 */
const HINTS: Record<string, string> = {
  role_forbidden: "Bu amal uchun rolingiz yetmaydi",
  grant_required: "Bu mahsulot bo'yicha dopusk yo'q — asosiy logist beradi",
  tracking_off: "Mahsulot nazoratga olinmagan — avval nazoratni yoqing",
  tracking_required_for_grant: "Dopusk berishdan oldin nazoratni yoqing",
  item_inactive: "Mahsulot faol emas",
  courier_region_mismatch: "Kuryer boshqa viloyatniki — ombor va kuryer bir viloyatda bo'lsin",
  version_conflict: "Boshqa logist o'zgartirgan — sahifani yangilang",
  validation_error: "Maydonlarni tekshiring",
  endpoint_missing: "Sklad uchun backend hali chiqmagan",
};

export function skladErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.code && HINTS[error.code]) return HINTS[error.code]!;
  return errorMessage(error, fallback);
}

/** `409 insufficient_stock` bo'lsa yetishmovchilik qatorlari, aks holda `null`. */
export function shortagesOf(error: unknown): Shortage[] | null {
  if (!(error instanceof ApiError) || error.code !== "insufficient_stock") return null;
  return mapShortages(error.data);
}
