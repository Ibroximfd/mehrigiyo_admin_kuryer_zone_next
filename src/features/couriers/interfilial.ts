import { differenceInCalendarDays, isValid, parseISO } from "date-fns";

import { asArray, asNumber, asRecord, isRecord } from "@/lib/parse";

import { mapFilial } from "./types";

/**
 * Filiallararo naqd hisobot (`GET /operator/cod/interfilial/`).
 *
 * Kuryer bir filialniki, pul boshqa filial kassasiga topshirilganda —
 * qaysi filial qaysi filialga qancha qarzdorligi shu yerda ko'rinadi.
 */

export type InterfilialRow = {
  fromFilial: { id: number; name: string } | null;
  toFilial: { id: number; name: string } | null;
  amount: number;
  handoverIds: number[];
};

export type InterfilialReport = { rows: InterfilialRow[]; total: number };

export function mapInterfilialReport(raw: unknown): InterfilialReport {
  const json = asRecord(raw);
  return {
    rows: asArray(json.rows)
      .filter(isRecord)
      .map((row) => ({
        fromFilial: mapFilial(row.from_filial),
        toFilial: mapFilial(row.to_filial),
        amount: asNumber(row.amount),
        handoverIds: asArray(row.handover_ids)
          .map((id) => Math.trunc(asNumber(id, Number.NaN)))
          .filter(Number.isFinite),
      })),
    total: asNumber(json.total),
  };
}

/** Server chegarasi: oraliq 92 kundan oshmaydi. */
export const INTERFILIAL_MAX_DAYS = 92;

/** Oraliq xatosi (ko'rsatiladigan matn) yoki `null`. */
export function interfilialRangeError(from: string, to: string): string | null {
  if (!from || !to) return "Ikkala sanani ham tanlang";
  const start = parseISO(from);
  const end = parseISO(to);
  if (!isValid(start) || !isValid(end)) return "Sana noto'g'ri";
  const days = differenceInCalendarDays(end, start);
  if (days < 0) return "Boshlanish sanasi tugashidan keyin bo'lmasin";
  if (days + 1 > INTERFILIAL_MAX_DAYS) return "Oraliq 92 kundan oshmasin";
  return null;
}

export function filialName(filial: { name: string } | null): string {
  return filial?.name || "—";
}

/** Hisobot qatori kaliti (bir juftlik bir marta keladi). */
export function interfilialRowKey(row: InterfilialRow, index: number): string {
  return `${row.fromFilial?.id ?? "x"}-${row.toFilial?.id ?? "x"}-${index}`;
}
