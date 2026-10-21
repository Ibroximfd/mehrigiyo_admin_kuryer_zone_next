"use client";

import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

import type { CourierServerFilter, CourierStatusFilter, ShiftFilter } from "../model/courier";

const SHIFT_VALUES = ["all", "on", "off"] as const satisfies readonly ShiftFilter[];
const STATUS_VALUES = ["active", "inactive", "all"] as const satisfies readonly CourierStatusFilter[];
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Kuryer filtrlari URL'da: `?region=&zone=&shift=&status=&q=` — havolani
 * ulashsa yoki "Orqaga" bossa, xuddi shu ro'yxat ochiladi. Hammasi serverda
 * filtrlanadi; qidiruv (`q`) serverga debounce bilan boradi.
 */
export function useCourierFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      region: parseAsString,
      zone: parseAsInteger,
      shift: parseAsStringLiteral(SHIFT_VALUES).withDefault("all"),
      status: parseAsStringLiteral(STATUS_VALUES).withDefault("active"),
      q: parseAsString.withDefault(""),
    },
    { history: "replace" },
  );

  const search = useDebouncedValue(filters.q, SEARCH_DEBOUNCE_MS);
  const server: CourierServerFilter = {
    region: filters.region,
    zone: filters.zone,
    shift: filters.shift,
    status: filters.status,
    search,
  };
  const isFiltered =
    filters.region !== null || filters.zone !== null || filters.shift !== "all" || filters.status !== "active" || filters.q !== "";

  return {
    filters,
    server,
    isFiltered,
    setRegion: (region: string | null) => void setFilters({ region, zone: null }),
    setZone: (zone: number | null) => void setFilters({ zone }),
    setShift: (shift: ShiftFilter) => void setFilters({ shift }),
    setStatus: (status: CourierStatusFilter) => void setFilters({ status }),
    setQuery: (q: string) => void setFilters({ q: q || null }),
    reset: () => void setFilters({ region: null, zone: null, shift: null, status: null, q: null }),
  };
}
