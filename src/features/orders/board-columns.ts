import { REVIEW_COLUMN } from "./review";
import { REVIEW_INFO } from "./review-board";
import { LOGIST_STATUSES } from "./types";

/**
 * Doska ustunlari tanlovi (2026-10-30): logist o'zi ishlaydigan ustunlarni
 * qoldiradi (masalan faqat «Yo'lda» va «Jarayonda»). Kamida bittasi
 * doim ko'rinadi — bo'sh doska «hech narsa yo'q» deb adashtirmasin.
 */
export type BoardColumnOption = { value: string; label: string; mark: string };

export const BOARD_COLUMN_OPTIONS: BoardColumnOption[] = LOGIST_STATUSES.flatMap((status) => {
  const option = { value: status.value as string, label: status.label as string, mark: status.mark as string };
  return status.value === "shipping" ? [option, { value: REVIEW_COLUMN, label: REVIEW_INFO.label, mark: REVIEW_INFO.mark }] : [option];
});

/** Ustunni yashirish/ko'rsatish; oxirgi ko'rinadigani yashirilmaydi. */
export function toggleHiddenColumn(hidden: readonly string[], value: string): string[] {
  if (hidden.includes(value)) return hidden.filter((item) => item !== value);
  const visible = BOARD_COLUMN_OPTIONS.filter((option) => !hidden.includes(option.value));
  if (visible.length <= 1) return [...hidden];
  return [...hidden, value];
}

/** Tanlovdan tashqari (eski saqlangan) kalitlar e'tiborsiz. */
export function visibleColumns<T extends { status: string }>(columns: readonly T[], hidden: readonly string[]): T[] {
  const shown = columns.filter((column) => !hidden.includes(column.status));
  return shown.length ? shown : [...columns];
}
