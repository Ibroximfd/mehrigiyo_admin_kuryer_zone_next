"use client";

import { useQuery } from "@tanstack/react-query";
import { createSerializer, parseAsString, useQueryStates } from "nuqs";

import { todayIso } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { ROUTES } from "@/lib/routes";

import { fetchSkladSheet, skladSheetParams } from "./api";
import type { SkladSheetQuery } from "./api";
import { monthRange, resolveDay, resolveRange } from "./period";

/**
 * Sklad jadvali. Oldingi javob vaqtinchalik (`placeholderData`) ushlab
 * turiladi — faqat «Hozirgi qoldiq» uchun: u sanaga bog'liq emas. Jadvalning
 * o'zi vaqtinchalik javobni chizmaydi (`QueryStateView`): pul va mol jadvalida
 * eski raqam yangi sana nomi bilan ko'rinmasin.
 */
export function useSkladSheet(query: SkladSheetQuery) {
  return useQuery({
    queryKey: queryKeys.chiefSkladSheet(skladSheetParams(query)),
    queryFn: ({ signal }) => fetchSkladSheet(query, signal),
    placeholderData: (previous) => previous,
  });
}

const PARSERS = { day: parseAsString, from: parseAsString, to: parseAsString, region: parseAsString };

const serialize = createSerializer(PARSERS);

/**
 * Davr URLda — havola ulashilsa ayni jadval ochiladi: kunlik — `?day=`, davr —
 * `?from=&to=&region=`. Sukutlar URLga yozilmaydi: bugun (kunlik), shu hafta
 * (davr), `to` yo'q — bugungacha; ertasi kuni sahifa o'zi yangi kunni ochadi.
 */
export function useSkladSheetPeriod() {
  const [state, setState] = useQueryStates(PARSERS);
  const today = todayIso();

  return {
    today,
    day: resolveDay(state.day, today),
    range: resolveRange({ from: state.from, to: state.to }, today),
    region: state.region,
    setDay: (day: string) => void setState({ day: day >= today ? null : day }),
    setRange: (from: string, to: string) => void setState({ from: from || null, to: to && to < today ? to : null }),
    showWeek: () => void setState({ from: null, to: null }),
    showMonth: () => void setState({ from: monthRange(today).dateFrom, to: null }),
    setRegion: (region: string | null) => void setState({ region }),
    /** Davr jadvalidagi kun → o'sha kunning kunlik jadvali; oraliq va hudud URLda qoladi (orqaga qaytish uchun). */
    dayHref: (day: string) => serialize(ROUTES.sklad, { day, from: state.from, to: state.to, region: state.region }),
  };
}

export type SkladSheetPeriod = ReturnType<typeof useSkladSheetPeriod>;
