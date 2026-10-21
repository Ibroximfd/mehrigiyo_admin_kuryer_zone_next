import { format as formatDateFns, isValid, parseISO } from "date-fns";

/**
 * Ko'rsatish formatlari. Pul va sana faqat shu yerdan o'tadi — har ekranda
 * o'zicha `toLocaleString` yozilmaydi.
 */

const THIN_SPACE = " ";

/** `"310000"` / `310000.5` → `310 000` (butun so'm, minglar ingichka bo'shliq bilan). */
export function formatAmount(value: number | string): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return String(value);
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  const grouped = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
  return `${sign}${grouped}`;
}

export function toDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = parseISO(iso);
  return isValid(date) ? date : null;
}

/** `2026-10-15T09:30:00Z` → `15.10.2026 14:30` (brauzer vaqt zonasida). */
export function formatDateTime(iso: string | null | undefined): string {
  const date = toDate(iso);
  return date ? formatDateFns(date, "dd.MM.yyyy HH:mm") : "—";
}

export function formatDate(iso: string | null | undefined): string {
  const date = toDate(iso);
  return date ? formatDateFns(date, "dd.MM.yyyy") : "—";
}

/** Nisbiy vaqt: "5 daqiqa oldin" / "5 минут назад". */
export function formatRelative(iso: string | null | undefined, locale: string, now = new Date()): string {
  const date = toDate(iso);
  if (!date) return "—";
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return formatter.format(0, "minute");
}
