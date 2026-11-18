import { addDays, format, parseISO } from "date-fns";
import { uz } from "date-fns/locale";

import { toIsoDay } from "@/lib/format";

/**
 * `YYYY-MM-DD` kunlar ustida yordamchilar — Toshkent (brauzer) kuni bo'yicha,
 * UTC ga o'tmasdan (`toIsoDay` izohiga qarang).
 */

/** `2026-11-17`, `-1` → `2026-11-16`. */
export function shiftIsoDay(iso: string, days: number): string {
  return toIsoDay(addDays(parseISO(iso), days));
}

/** `2026-11-17` → «17.11.2026 · seshanba» (hafta kuni kichik harfda — o'zbek imlosi). */
export function dayTitle(iso: string): string {
  const date = parseISO(iso);
  return `${format(date, "dd.MM.yyyy")} · ${format(date, "EEEE", { locale: uz }).toLowerCase()}`;
}
