import { addDays, differenceInCalendarDays, parseISO, startOfWeek } from "date-fns";

import { toIsoDay } from "@/lib/format";

/**
 * Haftalik naqd yig'im qoidalari (`KURYER_SAYTLAR_LOGIST_OPERATOR.md` §2.4).
 * Pul kuryerlardan haftada bir yig'iladi, hisob esa kunlik.
 */

/** Server bir so'rovda ko'pi bilan shuncha kunni qabul qiladi. */
export const MAX_COD_RANGE_DAYS = 31;

export type DateRange = { from: string; to: string };

/** Standart oraliq: joriy hafta dushanbasidan bugungacha. */
export function currentWeek(today: Date = new Date()): DateRange {
  return {
    from: toIsoDay(startOfWeek(today, { weekStartsOn: 1 })),
    to: toIsoDay(today),
  };
}

/** Oldingi to'liq hafta (dushanba–yakshanba) — dushanba kuni yig'im uchun. */
export function previousWeek(today: Date = new Date()): DateRange {
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  return {
    from: toIsoDay(addDays(monday, -7)),
    to: toIsoDay(addDays(monday, -1)),
  };
}

/** Oraliq to'g'rimi: teskari emas va 31 kundan oshmaydi. */
export function rangeError(range: DateRange): string | null {
  if (!range.from || !range.to) return "Sanalarni tanlang";
  const days = differenceInCalendarDays(parseISO(range.to), parseISO(range.from));
  if (days < 0) return "Boshlanish sanasi tugashdan keyin";
  if (days + 1 > MAX_COD_RANGE_DAYS) {
    return `Ko'pi bilan ${MAX_COD_RANGE_DAYS} kun`;
  }
  return null;
}

/**
 * Logist sanagan pul topshirilishi kerak bo'lgandan qanchaga farq qiladi.
 * Musbat — kam (kuryer qarzdor), manfiy — ortiqcha, `null` — kiritilmagan.
 */
export function countedDifference(
  outstanding: number,
  counted: number | null,
): number | null {
  if (counted === null) return null;
  return outstanding - counted;
}

/** "1 240 000" kabi kiritilgan summani songa aylantiradi; bo'sh — `null`. */
export function parseCountedAmount(value: string): number | null {
  const digits = value.replace(/[\s ,]/g, "");
  if (!digits) return null;
  if (!/^\d+$/.test(digits)) return Number.NaN;
  return Number.parseInt(digits, 10);
}
