"use client";

import { subDays } from "date-fns";
import { parseAsString, useQueryStates } from "nuqs";

import { toIsoDay, todayIso } from "@/lib/format";

export type DayPreset = "today" | "yesterday" | "custom";

/**
 * Hisobot davri URLda (`?from=&to=`): sukut — bugun; «Kecha» — bitta kun;
 * qolgani sana oralig'i. Havola ulashilsa xuddi shu davr ochiladi.
 */
export function useDayRange() {
  const [range, setRange] = useQueryStates({ from: parseAsString, to: parseAsString });
  const today = todayIso();
  const yesterday = toIsoDay(subDays(new Date(), 1));
  const from = range.from || range.to || today;
  const to = range.to || range.from || today;
  const preset: DayPreset =
    from === today && to === today ? "today" : from === yesterday && to === yesterday ? "yesterday" : "custom";

  return {
    from,
    to,
    preset,
    setToday: () => void setRange({ from: null, to: null }),
    setYesterday: () => void setRange({ from: yesterday, to: yesterday }),
    setRange: (nextFrom: string, nextTo: string) => void setRange({ from: nextFrom || null, to: nextTo || null }),
  };
}

export type DayRangeControls = ReturnType<typeof useDayRange>;
