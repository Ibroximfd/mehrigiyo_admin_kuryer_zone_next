"use client";

import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

import type { ChiefOrderFilters } from "./api";
import type { ChiefOrderScope } from "./types";

export const ORDER_SCOPES = ["incoming", "active", "delivered", "all"] as const satisfies readonly ChiefOrderScope[];

/**
 * Zakazlar filtri URLda (`nuqs`) — havola ulashilsa xuddi shu ro'yxat ochiladi.
 * `scope` — holat chiplari; qolganlari — qidiruv va filtrlar.
 */
export function useOrderFilters() {
  const [state, setState] = useQueryStates({
    scope: parseAsStringLiteral(ORDER_SCOPES),
    q: parseAsString,
    from: parseAsString,
    to: parseAsString,
    zone: parseAsInteger,
    courier: parseAsInteger,
    filial: parseAsInteger,
    region: parseAsString,
    district: parseAsString,
  });

  const filters: ChiefOrderFilters = {
    q: state.q,
    from: state.from,
    to: state.to,
    zoneId: state.zone,
    courierId: state.courier,
    filialId: state.filial,
    region: state.region,
    district: state.district,
  };
  const activeCount =
    [state.zone, state.courier, state.filial, state.region, state.district].filter((value) => value !== null).length +
    (state.from || state.to ? 1 : 0);

  return {
    scope: state.scope ?? "incoming",
    state,
    filters,
    activeCount,
    hasQuery: Boolean(state.q?.trim()),
    set: (patch: Partial<typeof state>) => void setState(patch),
    clear: () =>
      void setState({ q: null, from: null, to: null, zone: null, courier: null, filial: null, region: null, district: null }),
  };
}

export type OrderFilterControls = ReturnType<typeof useOrderFilters>;
