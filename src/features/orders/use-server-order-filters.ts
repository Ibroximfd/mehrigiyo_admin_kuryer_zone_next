"use client";

import { useMemo } from "react";

import type { OrdersQuery } from "./api";
import { serverOrdering } from "./order-sort";
import type { OrderSort } from "./order-sort";
import { serverFilterParams } from "./server-filters";
import type { OrderPeriod } from "./types";
import type { OrderFilters } from "./use-order-filters";
import { BOARD_COLUMN_OPTIONS } from "@/features/orders/board-columns";
import { useUiStore } from "@/stores/ui-store";

/** Ro'yxat sahifasi — server maksimumi 100 (§15.1), `pagination=false` YUBORILMAYDI. */
export const LIST_PAGE_SIZE = 30;

/**
 * Serverga ketadigan filtrlar — ro'yxat va doska uchun (2026-10-01 C §11).
 * Hammasi so'rovda: mijoz faqat "Yangi" / "Yangi xabar" chiplarini o'zi
 * suzadi (`client-filters.ts`).
 *
 * Kesh kaliti bo'lgani uchun `useMemo`: nuqs har renderda yangi massiv
 * beradi, mazmuni esa o'zgarmaydi — massivlar satr kaliti orqali bog'lanadi.
 * Doskada status yo'q: ustunlarning o'zi status.
 */
export function useServerOrderFilters(f: OrderFilters, search: string, sort: OrderSort) {
  const ordering = serverOrdering(sort);
  const statusKey = f.statuses.join(",");
  const {
    period,
    dateFrom,
    dateTo,
    courierId,
    source,
    tagFilter,
    paidFilter,
    methodFilter,
    creator,
    app,
    deliveryDate,
    quick,
    suggested,
    flagFilter,
  } = f;
  // Massivlar satr kaliti orqali — nuqs har renderda yangi massiv beradi.
  const districtKey = f.districts.join(",");
  const zoneKey = f.zones.join(",");
  const regionKey = f.regions.join(",");
  const chiefKey = f.chief;
  // Doska: faqat logist ko'rsatgan ustunlar so'raladi (`?columns=`).
  const hiddenColumns = useUiStore((state) => state.hiddenBoardColumns);
  const columnsKey = BOARD_COLUMN_OPTIONS.filter((option) => !hiddenColumns.includes(option.value))
    .map((option) => option.value)
    .join(",");

  const base = useMemo((): OrdersQuery => {
    const params = serverFilterParams({
      creator,
      app,
      deliveryDate,
      regions: regionKey ? regionKey.split(",") : [],
      chief: chiefKey,
      quick,
      paidFilter,
      methodFilter,
      courierId,
      districts: districtKey ? districtKey.split(",") : [],
      zones: zoneKey ? zoneKey.split(",") : [],
      suggested,
      flag: flagFilter,
    });
    return {
      period: period as OrderPeriod,
      dateFrom,
      dateTo,
      search,
      source,
      tag: tagFilter,
      ...params,
      ordering,
    };
  }, [
    period,
    dateFrom,
    dateTo,
    search,
    courierId,
    source,
    tagFilter,
    paidFilter,
    methodFilter,
    creator,
    app,
    deliveryDate,
    regionKey,
    chiefKey,
    quick,
    districtKey,
    zoneKey,
    suggested,
    flagFilter,
    ordering,
  ]);

  const board = useMemo(
    (): OrdersQuery => ({ ...base, columns: columnsKey.split(",") }),
    [base, columnsKey],
  );

  const list = useMemo(
    (): OrdersQuery => ({
      ...base,
      statuses: statusKey ? statusKey.split(",") : [],
      pageSize: LIST_PAGE_SIZE,
    }),
    [base, statusKey],
  );

  return { board, list };
}
