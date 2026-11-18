import { differenceInCalendarDays, parseISO, startOfMonth, startOfWeek } from "date-fns";

import { toIsoDay } from "@/lib/format";
import { shiftIsoDay } from "@/lib/iso-day";

/**
 * Sklad jadvali davri (hujjat 85 §1): bitta kun (`date_from = date_to`) yoki
 * oraliq, ≤ 93 kun. Kun — Toshkent bo'yicha (brauzer kuni). Kelajak kun
 * so'ralmaydi — u kunda harakat bo'lmaydi.
 */
export const SKLAD_SHEET_MAX_DAYS = 93;

export type DayRange = { dateFrom: string; dateTo: string };

export function isIsoDay(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseISO(value).getTime());
}

/** Kunlik ko'rinish kuni: URLdagi sana (bugundan keyin emas), bo'lmasa bugun. */
export function resolveDay(raw: string | null, today: string): string {
  return isIsoDay(raw) && raw < today ? raw : today;
}

/** Shu hafta — dushanbadan bugungacha. */
export function weekRange(today: string): DayRange {
  return { dateFrom: toIsoDay(startOfWeek(parseISO(today), { weekStartsOn: 1 })), dateTo: today };
}

/** Shu oy — 1-kunidan bugungacha. */
export function monthRange(today: string): DayRange {
  return { dateFrom: toIsoDay(startOfMonth(parseISO(today))), dateTo: today };
}

/** Oraliqdagi kunlar soni (ikki chet ham). */
export function rangeDays(range: DayRange): number {
  return differenceInCalendarDays(parseISO(range.dateTo), parseISO(range.dateFrom)) + 1;
}

/**
 * Davr ko'rinishi oralig'i. Sukut — shu hafta; `to` yo'q — bugungacha. Teskari
 * sanalar almashtiriladi, bugundan keyingisi bugunga, 93 kundan uzuni
 * oxiridan qisqartiriladi (server chegarasi).
 */
export function resolveRange(raw: { from: string | null; to: string | null }, today: string): DayRange {
  if (!isIsoDay(raw.from)) return weekRange(today);
  const to = isIsoDay(raw.to) && raw.to < today ? raw.to : today;
  const from = raw.from < today ? raw.from : today;
  const ordered = from <= to ? { dateFrom: from, dateTo: to } : { dateFrom: to, dateTo: from };
  if (rangeDays(ordered) <= SKLAD_SHEET_MAX_DAYS) return ordered;
  return { dateFrom: shiftIsoDay(ordered.dateTo, -(SKLAD_SHEET_MAX_DAYS - 1)), dateTo: ordered.dateTo };
}

export function isSameRange(a: DayRange, b: DayRange): boolean {
  return a.dateFrom === b.dateFrom && a.dateTo === b.dateTo;
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

/** Oraliq yozuvi — «09.11 — 14.11.2026» (yil farq qilsa ikkalasida ham yil). */
export function rangeTitle(range: DayRange): string {
  if (range.dateFrom === range.dateTo) return fullDate(range.dateFrom);
  const sameYear = range.dateFrom.slice(0, 4) === range.dateTo.slice(0, 4);
  return `${sameYear ? shortDate(range.dateFrom) : fullDate(range.dateFrom)} — ${fullDate(range.dateTo)}`;
}
