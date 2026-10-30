import { asArray, asOptionalString, asString } from "@/lib/parse";
import type { Json } from "@/lib/parse";

/**
 * Kuryer biriktirishdagi bloklamaydigan ogohlantirishlar (backend A2).
 * Server rad etmaydi — biriktirish bajarilgan, logistga faqat aytiladi.
 */
export const WARNING_ZONE_MISMATCH = "zone_mismatch";
export const WARNING_OFF_SHIFT = "courier_off_shift";

type Warned = string | { warning: string };

const codeOf = (item: Warned): string => (typeof item === "string" ? item : item.warning);

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

export function countWarning(items: readonly Warned[], code: string): number {
  return items.filter((item) => codeOf(item) === code).length;
}

/**
 * Toast matnlari — bitta buyurtma uchun ham, ommaviy uchun ham. Tartib:
 * smena, keyin zona. Noma'lum kod ko'rsatilmaydi (server yangi kod
 * qo'shsa UI jim qoladi, yiqilmaydi).
 */
export function assignWarningMessages(items: readonly Warned[]): string[] {
  const messages: string[] = [];
  const offShift = countWarning(items, WARNING_OFF_SHIFT);
  if (offShift > 0) messages.push(`${offShift} ta buyurtma smenasiz kuryerga biriktirildi`);
  const mismatch = countWarning(items, WARNING_ZONE_MISMATCH);
  if (mismatch > 0) messages.push(`${mismatch} ta buyurtmada kuryer zonasi mos emas`);
  return messages;
}

/** Ommaviy `failed[]` — kod bo'yicha guruhlab: `[code, count]`, server tartibida. */
export function groupFailures(
  failed: readonly { code: string }[],
): Array<[code: string, count: number]> {
  const groups = new Map<string, number>();
  for (const failure of failed) groups.set(failure.code, (groups.get(failure.code) ?? 0) + 1);
  return [...groups.entries()];
}
