import type { QueryValue } from "@/lib/api-client";
import { toIsoDay } from "@/lib/format";

/**
 * Filial + sana filtri — Moliya, Analitika, AI (`18_SKLAD…` §2): hamma
 * hisobot endpointida bir xil `?filial=&date_from=&date_to=`. URLda
 * turadi, bo'limlar orasida birga yuradi, eksport ham shu filtr bilan.
 * Backend faqat sana tushunadi — preset shu yerda sanaga aylanadi.
 */
export type PeriodPreset = "today" | "yesterday" | "week" | "month";

export const PERIOD_PRESETS: Array<{ value: PeriodPreset; label: string }> = [
  { value: "today", label: "Bugun" },
  { value: "yesterday", label: "Kecha" },
  { value: "week", label: "7 kun" },
  { value: "month", label: "30 kun" },
];

export type PeriodFilter = {
  /** `null` — barcha filiallar. */
  filialId: number | null;
  from: string;
  to: string;
};

export function presetRange(preset: PeriodPreset, now = new Date()): { from: string; to: string } {
  const day = (offset: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - offset);
    return toIsoDay(date);
  };
  switch (preset) {
    case "today":
      return { from: day(0), to: day(0) };
    case "yesterday":
      return { from: day(1), to: day(1) };
    case "week":
      return { from: day(6), to: day(0) };
    case "month":
      return { from: day(29), to: day(0) };
  }
}

/** Joriy oraliq qaysi presetga to'g'ri keladi (chip belgilash uchun). */
export function presetOf(filter: Pick<PeriodFilter, "from" | "to">, now = new Date()): PeriodPreset | null {
  return PERIOD_PRESETS.find((entry) => {
    const range = presetRange(entry.value, now);
    return range.from === filter.from && range.to === filter.to;
  })?.value ?? null;
}

export function periodParams(filter: PeriodFilter): Record<string, QueryValue> {
  return {
    filial: filter.filialId ?? "all",
    date_from: filter.from,
    date_to: filter.to,
  };
}

/** Eksport fayl nomi (§12): `sklad_<bo'lim>_<filial|all>_<from>_<to>.xlsx`. */
export function exportFileName(section: string, filter: PeriodFilter, ext = "xlsx"): string {
  return `sklad_${section}_${filter.filialId ?? "all"}_${filter.from}_${filter.to}.${ext}`;
}
