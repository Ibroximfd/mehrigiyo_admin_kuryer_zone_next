"use client";

import { parseAsString, useQueryState } from "nuqs";
import { useMemo } from "react";

import type { QueryValue } from "@/lib/api-client";

import {
  DEFAULT_STAT_PERIOD,
  describeStatFilter,
  hasCustomDates,
  normalizeStatFilter,
  statParams,
  type StatFilter,
  type StatPeriod,
} from "./filter";

/**
 * Davr tanlovi manzil qatorida turadi (`?period=`, `?date=`, `?from=`,
 * `?to=`). Shu sababli sahifa yangilansa ham tanlov joyida qoladi, havolani
 * hamkasbga tashlash mumkin va operator detali ochilganda ham o'sha davr
 * saqlanadi — hujjatning §5.3 talabi.
 *
 * Nom `from`/`to`: buyurtmalar ekranidagi bilan bir xil, ya'ni bitta odat.
 */
export type StatFilterControls = {
  filter: StatFilter;
  /** So'rovga ketadigan parametrlar — kesh kaliti ham shundan quriladi. */
  params: Record<string, QueryValue>;
  /** Sarlavha uchun matn: "Bugun", "15.08.2026", "10.08 — 20.08". */
  label: string;
  /** Preset emas, aniq sana tanlanganmi. */
  isCustom: boolean;
  selectPeriod: (period: StatPeriod) => void;
  selectRange: (from: string | null, to: string | null) => void;
  /** Sanalarni tozalab, sukutdagi davrga qaytaradi. */
  resetDates: () => void;
};

export function useStatFilter(): StatFilterControls {
  const [period, setPeriod] = useQueryState(
    "period",
    parseAsString
      .withDefault(DEFAULT_STAT_PERIOD)
      .withOptions({ clearOnDefault: true }),
  );
  const [date, setDate] = useQueryState("date", parseAsString);
  const [dateFrom, setDateFrom] = useQueryState("from", parseAsString);
  const [dateTo, setDateTo] = useQueryState("to", parseAsString);

  const filter = useMemo(
    () => normalizeStatFilter({ period, date, dateFrom, dateTo }),
    [period, date, dateFrom, dateTo],
  );

  return useMemo(() => {
    const clearDates = () => {
      void setDate(null);
      void setDateFrom(null);
      void setDateTo(null);
    };

    return {
      filter,
      params: statParams(filter),
      label: describeStatFilter(filter),
      isCustom: hasCustomDates(filter),

      selectPeriod(next) {
        void setPeriod(next);
        // Preset va aniq sana bir-birini inkor qiladi (backendda sana
        // ustun turadi), shuning uchun preset tanlansa sanalar tushadi.
        clearDates();
      },

      selectRange(from, to) {
        // Ikkala maydon ham bo'shatilsa — bu "filtrni olib tashla" degani,
        // "butun davr" emas: sukutdagi kunga qaytamiz.
        if (!from && !to) {
          clearDates();
          void setPeriod(DEFAULT_STAT_PERIOD);
          return;
        }

        void setDateFrom(from || null);
        void setDateTo(to || null);
        // `?date=` faqat havoladan kelishi mumkin; oraliq tanlangach u
        // ortiqcha — aks holda backend baribir o'sha bitta kunni qaytaradi.
        void setDate(null);
        // Filtr qatori haqiqatda nima ishlayotganini ko'rsatib tursin.
        void setPeriod("all");
      },

      resetDates() {
        clearDates();
        void setPeriod(DEFAULT_STAT_PERIOD);
      },
    };
  }, [filter, setPeriod, setDate, setDateFrom, setDateTo]);
}
