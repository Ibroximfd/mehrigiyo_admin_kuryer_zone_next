"use client";

import { parseAsArrayOf, parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

import { useSalesFilialParam } from "@/features/sales-centers/use-sales-centers";

import type { ChiefOrderFilters } from "./api";
import { DEFAULT_ORDER_SORT, DISTRICT_FILTERS, ORDER_SORTS, SERVER_ORDERING } from "./order-sort";
import type { OrderSort, ProductMatch } from "./order-sort";
import type { ChiefOrderScope } from "./types";

export const ORDER_SCOPES = ["incoming", "active", "delivered", "all"] as const satisfies readonly ChiefOrderScope[];
const PRODUCT_MATCHES = ["all"] as const;

/** Mahsulot va tartib tanlovi — panel va chiplar o'qiydi. */
export type OrderSelection = {
  productIds: readonly number[];
  productMatch: ProductMatch;
  sort: OrderSort;
};

/**
 * Zakazlar filtri URLda (`nuqs`) — havola ulashilsa xuddi shu ro'yxat ochiladi,
 * filtr xotirasi (`FilterMemory`) ham shu qatorni saqlaydi va qaytaradi.
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
    /** Markaz (136-javob) — sotgan call-markaz id si. */
    center: parseAsInteger,
    region: parseAsString,
    district: parseAsString,
    products: parseAsArrayOf(parseAsInteger),
    pmatch: parseAsStringLiteral(PRODUCT_MATCHES),
    min: parseAsInteger,
    max: parseAsInteger,
    sort: parseAsStringLiteral(ORDER_SORTS),
    tuman: parseAsStringLiteral(DISTRICT_FILTERS),
  });

  const productIds = state.products ?? [];
  // Markaz tanlovi yo'q serverda (eski, bitta markaz) qiymat yuborilmaydi.
  const salesFilial = useSalesFilialParam(state.center);
  const selection: OrderSelection = {
    productIds,
    productMatch: state.pmatch ?? "any",
    sort: state.sort ?? DEFAULT_ORDER_SORT,
  };
  const filters: ChiefOrderFilters = {
    q: state.q,
    from: state.from,
    to: state.to,
    zoneId: state.zone,
    courierId: state.courier,
    filialId: state.filial,
    salesFilial,
    region: state.region,
    district: state.district,
    productIds,
    productMatch: selection.productMatch,
    amountMin: state.min,
    amountMax: state.max,
    ordering: SERVER_ORDERING[selection.sort],
    districtFilter: state.tuman,
  };
  /** «Filtrlar» panelidagilar (asosiy qatordan tashqari) — tugmadagi son. */
  const panelCount =
    [state.filial, state.region, state.district, state.tuman].filter((value) => value !== null).length +
    (state.min !== null || state.max !== null ? 1 : 0);
  const activeCount =
    panelCount +
    // Markaz — asosiy qatorda (keng ekranda), panel soniga kirmaydi.
    [state.zone, state.courier, state.center].filter((value) => value !== null).length +
    (productIds.length > 0 ? 1 : 0) +
    (state.from || state.to ? 1 : 0);

  return {
    scope: state.scope ?? "incoming",
    state,
    filters,
    selection,
    activeCount,
    panelCount,
    hasQuery: Boolean(state.q?.trim()),
    set: (patch: Partial<typeof state>) => void setState(patch),
    /** Tartib filtr emas — tozalashda qoladi. */
    clear: () =>
      void setState({
        q: null,
        from: null,
        to: null,
        zone: null,
        courier: null,
        filial: null,
        center: null,
        region: null,
        district: null,
        products: null,
        pmatch: null,
        min: null,
        max: null,
        tuman: null,
      }),
  };
}

export type OrderFilterControls = ReturnType<typeof useOrderFilters>;
