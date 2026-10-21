import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  isValid,
  parse,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";

/**
 * Hisobot oralig'i. Server sanani majburiy va ≤ 92 kun deb tekshiradi
 * (`400 validation_error`); klient ham shuni oldindan tekshiradi — admin
 * so'rov yuborib xato kutmasin. Sana formati `yyyy-MM-dd`.
 */

export const MAX_RANGE_DAYS = 92;
const ISO_DAY = "yyyy-MM-dd";

export type DateRange = { from: string; to: string };

export type RangeValidation = "ok" | "missing" | "invalid" | "reversed" | "tooLong";

export function toIsoDay(date: Date): string {
  return format(date, ISO_DAY);
}

export function parseIsoDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = parse(value, ISO_DAY, new Date());
  return isValid(date) ? date : null;
}

/** Oraliqdagi kunlar soni, ikkala chekka ham kiradi (1-dan 1-gacha = 1 kun). */
export function rangeLengthDays(range: DateRange): number | null {
  const from = parseIsoDay(range.from);
  const to = parseIsoDay(range.to);
  if (!from || !to) return null;
  return differenceInCalendarDays(to, from) + 1;
}

export function validateRange(range: DateRange): RangeValidation {
  if (!range.from || !range.to) return "missing";
  const length = rangeLengthDays(range);
  if (length === null) return "invalid";
  if (length < 1) return "reversed";
  // Ikkala chekka ham sanaladi — server qanday sanasa ham chegaradan oshmaymiz.
  if (length > MAX_RANGE_DAYS) return "tooLong";
  return "ok";
}

/** Sukut: joriy oyning 1-kunidan bugungacha. */
export function defaultRange(today: Date): DateRange {
  return { from: toIsoDay(startOfMonth(today)), to: toIsoDay(today) };
}

export type RangePreset = "thisMonth" | "lastMonth" | "last7" | "last30" | "last90";

export const RANGE_PRESETS: readonly RangePreset[] = ["thisMonth", "lastMonth", "last7", "last30", "last90"];

export function presetRange(preset: RangePreset, today: Date): DateRange {
  switch (preset) {
    case "thisMonth":
      return defaultRange(today);
    case "lastMonth": {
      const previous = subMonths(today, 1);
      return { from: toIsoDay(startOfMonth(previous)), to: toIsoDay(endOfMonth(previous)) };
    }
    case "last7":
      return { from: toIsoDay(subDays(today, 6)), to: toIsoDay(today) };
    case "last30":
      return { from: toIsoDay(subDays(today, 29)), to: toIsoDay(today) };
    case "last90":
      return { from: toIsoDay(subDays(today, 89)), to: toIsoDay(today) };
  }
}

export function sameRange(a: DateRange, b: DateRange): boolean {
  return a.from === b.from && a.to === b.to;
}
