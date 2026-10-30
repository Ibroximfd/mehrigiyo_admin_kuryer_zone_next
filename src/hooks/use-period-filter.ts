"use client";

import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useMemo } from "react";

import { presetOf, presetRange, type PeriodFilter, type PeriodPreset } from "@/lib/period-filter";

/**
 * Filial + sana manzil qatorida (`?filial=`, `?from=`, `?to=`): Moliya,
 * Analitika va AI sahifalari orasida bir xil, havola ulashiladi.
 * Sukut — bugun, barcha filiallar.
 */
export function usePeriodFilter() {
  const today = presetRange("today");
  const [filialId, setFilialId] = useQueryState("filial", parseAsInteger);
  const [from, setFrom] = useQueryState("from", parseAsString.withDefault(today.from).withOptions({ clearOnDefault: true }));
  const [to, setTo] = useQueryState("to", parseAsString.withDefault(today.to).withOptions({ clearOnDefault: true }));

  const filter = useMemo<PeriodFilter>(
    () => ({ filialId, from: from && to && from > to ? to : from, to: from && to && from > to ? from : to }),
    [filialId, from, to],
  );

  return useMemo(
    () => ({
      filter,
      preset: presetOf(filter),
      /** Manzil o'zgarmasdan boshqa sahifaga o'tish uchun `?…` qismi. */
      search: `?${new URLSearchParams({
        ...(filter.filialId ? { filial: String(filter.filialId) } : {}),
        from: filter.from,
        to: filter.to,
      }).toString()}`,
      setFilial: (next: number | null) => void setFilialId(next),
      setPreset: (preset: PeriodPreset) => {
        const range = presetRange(preset);
        void setFrom(range.from);
        void setTo(range.to);
      },
      setRange: (nextFrom: string, nextTo: string) => {
        void setFrom(nextFrom || today.from);
        void setTo(nextTo || today.to);
      },
    }),
    [filter, setFilialId, setFrom, setTo, today.from, today.to],
  );
}

export type PeriodFilterControls = ReturnType<typeof usePeriodFilter>;
