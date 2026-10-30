/**
 * Ro'yxat filtrlari — leadlar, buyurtmalar va statistikada bir xil ishlaydi.
 *
 * Backend hujjatining §3 qoidalari shu yerda bir marta yozilgan, aks holda
 * har bir modulda takrorlanib, birida esdan chiqib qolardi.
 */

import type { QueryValue } from "@/lib/api-client";

export type DatePeriod =
  "all" | "today" | "yesterday" | "week" | "month" | "year";

export const DATE_PERIODS: Array<{ value: DatePeriod; label: string }> = [
  { value: "all", label: "Barchasi" },
  { value: "today", label: "Bugun" },
  { value: "yesterday", label: "Kecha" },
  { value: "week", label: "Hafta" },
  { value: "month", label: "Oy" },
  { value: "year", label: "Yil" },
];

export type DateFilter = {
  period?: DatePeriod | string | null;
  /** Aynan shu kun (`YYYY-MM-DD`). Berilsa `period` e'tiborsiz qoladi. */
  date?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

/**
 * Sana parametrlari. Ustuvorlik hujjatdagidek:
 *   `date` > `date_from`/`date_to` > `period`
 * Aniqroq so'rov umumiyroq presetni bosadi.
 */
export function buildDateParams(
  filter: DateFilter,
): Record<string, QueryValue> {
  const { period, date, dateFrom, dateTo } = filter;

  if (date) return { date };
  if (dateFrom || dateTo) {
    return {
      date_from: dateFrom ?? undefined,
      date_to: dateTo ?? undefined,
    };
  }
  // `all` — backendning sukutdagi holati, yuborish shart emas.
  return period && period !== "all" ? { period } : {};
}

/**
 * Ro'yxatni sahifalashsiz so'rash.
 *
 * ⚠️ Javob **shaklini** o'zgartiradi (obyekt → massiv), shuning uchun uni
 * `asPage` bilan o'qish shart. Katta ro'yxatlarda faqat eksport uchun.
 */
export function paginationOff(): Record<string, QueryValue> {
  return { pagination: "false" };
}
