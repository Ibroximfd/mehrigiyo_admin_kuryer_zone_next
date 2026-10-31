import { asArray, asOptionalString, asString } from "@/lib/parse";
import type { Json } from "@/lib/parse";

/**
 * Kuryer biriktirishdagi bloklamaydigan ogohlantirishlar (backend A2).
 * Server rad etmaydi — biriktirish bajarilgan, logistga faqat aytiladi.
 */
export const WARNING_ZONE_MISMATCH = "zone_mismatch";
export const WARNING_OFF_SHIFT = "courier_off_shift";

/**
 * PATCH javobidan kodlar: `warnings: ["..."]` (yangi) yoki `warning: "..."`
 * (eski, bitta). Ikkalasi ham bo'lsa — `warnings` ustun, takror yo'q.
 */
export function patchWarningCodes(json: Json): string[] {
  const list = asArray(json.warnings).map((item) => asString(item)).filter(Boolean);
  if (list.length) return [...new Set(list)];
  const single = asOptionalString(json.warning);
  return single ? [single] : [];
}
