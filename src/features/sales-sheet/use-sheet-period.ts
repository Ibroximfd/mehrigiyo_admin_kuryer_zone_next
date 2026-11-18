"use client";

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

import { todayIso } from "@/lib/format";

import { DEFAULT_SHEET_PERIOD, isSingleDay, resolveSheetRange, SHEET_PERIOD_VALUES, shiftDay } from "./period";
import type { SheetPeriod } from "./period";

const PARSERS = {
  p: parseAsStringLiteral(SHEET_PERIOD_VALUES).withDefault(DEFAULT_SHEET_PERIOD),
  from: parseAsString,
  to: parseAsString,
};

/**
 * Davr URLda — havola ulashilsa ayni davr ochiladi:
 * `?p=day|week|month|range&from=&to=`. Sukut — bugun: bugungi kun URLga
 * yozilmaydi, ertasi kuni sahifa o'zi yangi kunni ochadi. Kun rejimida
 * `from` — tanlangan kun.
 */
export function useSheetPeriod() {
  const [state, setState] = useQueryStates(PARSERS);
  const range = resolveSheetRange(state.p, { from: state.from, to: state.to });
  const today = todayIso();

  const setDay = (day: string) => void setState({ p: "day", from: day >= today ? null : day, to: null });

  return {
    period: state.p,
    range,
    singleDay: isSingleDay(range),
    /** Kun rejimida bugun ochiq — «keyingi kun» yo'q. */
    isToday: range.dateTo === today,
    /** Oraliqqa o'tilganda joriy davr maydonlarga tushadi — ko'ringan sanalar yo'qolmaydi. */
    setPeriod: (period: SheetPeriod) =>
      void setState(period === "range" ? { p: period, from: range.dateFrom, to: range.dateTo } : { p: period, from: null, to: null }),
    setDay,
    shiftDay: (days: number) => setDay(shiftDay(range.dateFrom, days)),
    setRange: (from: string, to: string) => void setState({ p: "range", from: from || null, to: to || null }),
  };
}

export type SheetPeriodControls = ReturnType<typeof useSheetPeriod>;
