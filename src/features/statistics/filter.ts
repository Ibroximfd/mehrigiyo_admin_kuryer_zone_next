/**
 * Statistika davri — uchala ekran uchun bitta ta'rif.
 *
 * Backend hujjati (§2) uchta shaklni tushunadi, ustuvorlik shu tartibda:
 *   `date` > `date_from`/`date_to` > `period`
 * Uchala endpoint ham buni bir xil o'qiydi, shuning uchun tanlov shu yerda
 * bir marta yig'iladi va so'rovga ham, kesh kalitiga ham shundan tarqaladi.
 * Aks holda "operator ekranida oy, admin ekranida hafta" degan jimgina
 * nomuvofiqlik chiqadi.
 */

import type { QueryValue } from "@/lib/api-client";
import { buildDateParams, type DatePeriod } from "@/lib/list-filters";

/** Statistika davri — ro'yxatlardagi bilan aynan bir xil to'plam. */
export type StatPeriod = DatePeriod;

/**
 * Davr presetlari. Tartib qamrov bo'yicha kengayadi va **"Bugun" birinchi
 * turadi**: statistika sahifasi ham o'sha bilan ochiladi.
 */
export const STAT_PERIODS: Array<{ value: StatPeriod; label: string }> = [
  { value: "today", label: "Bugun" },
  { value: "yesterday", label: "Kecha" },
  { value: "week", label: "Hafta" },
  { value: "month", label: "Oy" },
  { value: "year", label: "Yil" },
  { value: "all", label: "Barchasi" },
];

export const DEFAULT_STAT_PERIOD: StatPeriod = "today";

const PERIOD_VALUES = new Set<string>(STAT_PERIODS.map((item) => item.value));

/** Backend faqat `YYYY-MM-DD` ni tushunadi. */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export type StatFilter = {
  period: StatPeriod;
  /** Aynan shu kun. Berilsa `period` va oraliq e'tiborsiz qoladi. */
  date: string | null;
  dateFrom: string | null;
  dateTo: string | null;
};

/** Filtrsiz holat — sukut bo'yicha butun davr. */
export const ALL_TIME_FILTER: StatFilter = {
  period: "all",
  date: null,
  dateFrom: null,
  dateTo: null,
};

/** Manzil qatoridan kelgan qiymatni davrga aylantiradi. */
export function asStatPeriod(value: string | null | undefined): StatPeriod {
  const text = (value ?? "").trim();
  return PERIOD_VALUES.has(text) ? (text as StatPeriod) : DEFAULT_STAT_PERIOD;
}

/** Faqat to'g'ri yozilgan sana o'tadi — qolgani yo'q deb hisoblanadi. */
function asDay(value: string | null | undefined): string | null {
  const text = (value ?? "").trim();
  return ISO_DAY.test(text) ? text : null;
}

/**
 * Filtrni tartibga soladi: buzuq sanalar tashlanadi, teskari oraliq
 * ("20-dan 10-gacha") joyiga qo'yiladi. `YYYY-MM-DD` leksikografik
 * solishtiruvda ham xronologik bo'lgani uchun `Date` kerak emas — vaqt
 * mintaqasi bilan bog'liq siljish ham chiqmaydi.
 */
export function normalizeStatFilter(raw: {
  period?: string | null;
  date?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}): StatFilter {
  let from = asDay(raw.dateFrom);
  let to = asDay(raw.dateTo);
  if (from && to && from > to) [from, to] = [to, from];

  return {
    period: asStatPeriod(raw.period),
    date: asDay(raw.date),
    dateFrom: from,
    dateTo: to,
  };
}

/**
 * So'rov parametrlari.
 *
 * Bitta kun tanlansa (`from === to`) ikkita chegara emas, hujjatdagi
 * `?date=` yuboriladi — bu backendning "aynan o'sha kun" yo'li.
 */
export function statParams(raw: StatFilter): Record<string, QueryValue> {
  const filter = normalizeStatFilter(raw);

  if (!filter.date && filter.dateFrom && filter.dateFrom === filter.dateTo) {
    return { date: filter.dateFrom };
  }
  return buildDateParams(filter);
}

/** Preset emas, aniq sana tanlanganmi. */
export function hasCustomDates(filter: StatFilter): boolean {
  return Boolean(filter.date ?? filter.dateFrom ?? filter.dateTo);
}

/** `2026-08-15` → `15.08.2026`. */
export function formatDay(day: string): string {
  const [year, month, date] = day.split("-");
  return `${date}.${month}.${year}`;
}

/** Sarlavhada ko'rinadigan matn: "Bugun", "15.08.2026", "10.08 — 20.08". */
export function describeStatFilter(filter: StatFilter): string {
  if (filter.date) return formatDay(filter.date);

  const { dateFrom, dateTo } = filter;
  if (dateFrom && dateTo) {
    return dateFrom === dateTo
      ? formatDay(dateFrom)
      : `${formatDay(dateFrom)} — ${formatDay(dateTo)}`;
  }
  if (dateFrom) return `${formatDay(dateFrom)} dan`;
  if (dateTo) return `${formatDay(dateTo)} gacha`;

  return (
    STAT_PERIODS.find((item) => item.value === filter.period)?.label ??
    "Barchasi"
  );
}

/**
 * Davr aynan bitta kunmi — qo'lda tuzatish faqat shunda mumkin (`YYYY-MM-DD`).
 * Bugun/kecha mahalliy sanadan; aks holda `null`.
 */
export function singleStatDay(raw: StatFilter, now = new Date()): string | null {
  const filter = normalizeStatFilter(raw);
  if (filter.date) return filter.date;
  if (filter.dateFrom || filter.dateTo) return filter.dateFrom && filter.dateFrom === filter.dateTo ? filter.dateFrom : null;
  const shift = filter.period === "today" ? 0 : filter.period === "yesterday" ? -1 : null;
  if (shift === null) return null;
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + shift);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}
