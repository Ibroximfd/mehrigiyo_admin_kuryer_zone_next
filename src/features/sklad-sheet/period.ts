import { parseISO } from "date-fns";

/**
 * Sklad jadvali kuni (hujjat 85 §1): bitta kun (`date_from = date_to`). Kun —
 * Toshkent bo'yicha (brauzer kuni). Kelajak kun so'ralmaydi — u kunda harakat
 * bo'lmaydi. «Sanadan sanagacha» ko'rinishi olib tashlandi (egasi, 2026-11-20).
 */
export type DayRange = { dateFrom: string; dateTo: string };

export function isIsoDay(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseISO(value).getTime());
}

/** Ko'rinish kuni: URLdagi sana (bugundan keyin emas), bo'lmasa bugun. */
export function resolveDay(raw: string | null, today: string): string {
  return isIsoDay(raw) && raw < today ? raw : today;
}

/** `2026-11-17` → `17.11.2026`. */
export function fullDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

/** `2026-11-17` → `17.11`. */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${day}.${month}`;
}
