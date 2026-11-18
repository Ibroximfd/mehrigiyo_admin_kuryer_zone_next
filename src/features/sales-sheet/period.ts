import { addDays, differenceInCalendarDays, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { uz } from "date-fns/locale";

import { toIsoDay } from "@/lib/format";

import { fullDate, shortDate } from "./display";

/**
 * Sotuv jadvali davri (hujjat 83 §1, §2): bir kun, shu hafta, shu oy yoki
 * istalgan oraliq. Sukut — bugun. Kun Toshkent bo'yicha — bosh kuryerlar
 * Toshkent vaqtida ishlaydi, brauzer kuni shu.
 */
export const SHEET_PERIODS = [
  { value: "day", label: "Kun" },
  { value: "week", label: "Hafta" },
  { value: "month", label: "Oy" },
  { value: "range", label: "Oraliq" },
] as const;

export type SheetPeriod = (typeof SHEET_PERIODS)[number]["value"];

/** Davr tugmasi: qiymat va yorliq (sahifa o'z nomini berishi mumkin — Kassa: «Sanadan sanagacha»). */
export type PeriodOption = { value: SheetPeriod; label: string };

export const SHEET_PERIOD_VALUES = SHEET_PERIODS.map((period) => period.value);

export const DEFAULT_SHEET_PERIOD: SheetPeriod = "day";

/** Server oraliq chegarasi (§2). */
export const SHEET_MAX_DAYS = 93;

export type SheetRange = { dateFrom: string; dateTo: string };

function isIsoDay(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseISO(value).getTime());
}

/**
 * Davrdan sana oralig'i. `day` — `custom.from` kuni (bo'lmasa bugun; kelajak
 * kun — bugun); `week` — dushanbadan bugungacha; `month` — oyning 1-kunidan
 * bugungacha; `range` — berilgan sanalar, 93 kundan uzuni oxiridan qisqartiriladi.
 */
export function resolveSheetRange(
  period: SheetPeriod,
  custom: { from: string | null; to: string | null },
  now: Date = new Date(),
): SheetRange {
  const today = toIsoDay(now);
  if (period === "week") return { dateFrom: toIsoDay(startOfWeek(now, { weekStartsOn: 1 })), dateTo: today };
  if (period === "month") return { dateFrom: toIsoDay(startOfMonth(now)), dateTo: today };
  if (period === "range") {
    const from = isIsoDay(custom.from) ? custom.from : today;
    const to = isIsoDay(custom.to) ? custom.to : from;
    return clampRange(from <= to ? { dateFrom: from, dateTo: to } : { dateFrom: to, dateTo: from });
  }
  const day = isIsoDay(custom.from) && custom.from < today ? custom.from : today;
  return { dateFrom: day, dateTo: day };
}

function clampRange(range: SheetRange): SheetRange {
  if (rangeDays(range) <= SHEET_MAX_DAYS) return range;
  return { dateFrom: shiftDay(range.dateTo, -(SHEET_MAX_DAYS - 1)), dateTo: range.dateTo };
}

/** Oraliqdagi kunlar soni (ikki chet ham). */
export function rangeDays(range: SheetRange): number {
  return differenceInCalendarDays(parseISO(range.dateTo), parseISO(range.dateFrom)) + 1;
}

export function isSingleDay(range: SheetRange): boolean {
  return range.dateFrom === range.dateTo;
}

/** `2026-11-16`, `-1` → `2026-11-15`. */
export function shiftDay(iso: string, days: number): string {
  return toIsoDay(addDays(parseISO(iso), days));
}

/** Hafta kuni kichik harfda — o'zbek imlosida shunday (`formatUzDate` bilan bir xil). */
function weekday(iso: string): string {
  return format(parseISO(iso), "EEEE", { locale: uz }).toLowerCase();
}

/** «16.11.2026 · dushanba». */
export function dayTitle(iso: string): string {
  return `${fullDate(iso)} · ${weekday(iso)}`;
}

/** Bir kun — «16.11.2026 · dushanba»; oraliq — «10.11 – 16.11.2026» (yil farq qilsa ikkalasida ham yil). */
export function rangeTitle(range: SheetRange): string {
  if (isSingleDay(range)) return dayTitle(range.dateFrom);
  const sameYear = range.dateFrom.slice(0, 4) === range.dateTo.slice(0, 4);
  return `${sameYear ? shortDate(range.dateFrom) : fullDate(range.dateFrom)} – ${fullDate(range.dateTo)}`;
}
