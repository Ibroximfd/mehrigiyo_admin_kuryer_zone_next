/**
 * WS dublikatlari (backend B6, 2026-10-30): operator soketi endi filial
 * VA bo'lim guruhiga ulanadi, lid hodisalari (`lead_created`,
 * `lead_stage_changed` …) ikkalasiga ham bir xil payload bilan ketadi.
 * Ikkinchi nusxa ovoz, xabar va hisoblagichni ikki marta ishlatmasin.
 *
 * Kalit — tur + to'liq payload (kalitlar tartiblangan). Faqat qisqa oyna
 * ichidagi AYNAN bir xil hodisa tashlanadi: bitta lidning ketma-ket
 * haqiqiy o'zgarishlari (boshqa bosqich, boshqa vaqt) payload bilan farq
 * qiladi va o'tadi.
 */
const WINDOW_MS = 5_000;
const LIMIT = 300;

/** Dublikat keladigan hodisalar — boshqa turlar tekshirilmaydi. */
const DEDUPED_TYPES = new Set([
  "lead_created",
  "lead_stage_changed",
  "lead_assigned",
  "lead_updated",
  "lead_handover",
]);

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function createWsDeduper(now: () => number = Date.now) {
  const seen = new Map<string, number>();
  return function isDuplicate(type: string, payload: Record<string, unknown>): boolean {
    if (!DEDUPED_TYPES.has(type)) return false;
    const at = now();
    for (const [key, time] of seen) {
      if (at - time > WINDOW_MS || seen.size > LIMIT) seen.delete(key);
      else break;
    }
    const key = `${type}|${stable(payload)}`;
    const previous = seen.get(key);
    if (previous !== undefined && at - previous <= WINDOW_MS) return true;
    seen.delete(key);
    seen.set(key, at);
    return false;
  };
}

/** Ilova bo'ylab bitta (soket bitta). */
export const isDuplicateWsEvent = createWsDeduper();
