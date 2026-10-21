"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchInterfilialReport } from "../api/interfilial-api";
import type { DateRange } from "../model/date-range";

export const interfilialKeys = {
  all: ["interfilial"] as const,
  report: (range: DateRange) => [...interfilialKeys.all, range.from, range.to] as const,
};

/** Noto'g'ri oraliqda so'rov umuman ketmaydi (`enabled`). */
export function useInterfilialReport(range: DateRange, enabled: boolean) {
  return useQuery({
    queryKey: interfilialKeys.report(range),
    queryFn: ({ signal }) => fetchInterfilialReport(range, signal),
    enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
