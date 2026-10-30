"use client";

import { parseAsString, useQueryState } from "nuqs";
import { useCallback } from "react";

import { useUiStore } from "@/stores/ui-store";

import { DEFAULT_ORDER_SORT, isOrderSort } from "./order-sort";
import type { OrderSort } from "./order-sort";

/**
 * Buyurtmalar tartibi — `useOrdersView` bilan bir xil ikki qatlam:
 * URL (`?sort=amount`) havola ulashilganda ustun, `localStorage` esa
 * havolasiz kirilganda oxirgi tanlovni tiklaydi. Sukut URLga yozilmaydi.
 */
export function useOrderSort(): [OrderSort, (sort: OrderSort) => void] {
  const stored = useUiStore((state) => state.ordersSort);
  const setStored = useUiStore((state) => state.setOrdersSort);
  const [param, setParam] = useQueryState("sort", parseAsString);

  const sort: OrderSort = isOrderSort(param)
    ? param
    : isOrderSort(stored)
      ? stored
      : DEFAULT_ORDER_SORT;

  const setSort = useCallback(
    (next: OrderSort) => {
      setStored(next);
      void setParam(next === DEFAULT_ORDER_SORT ? null : next);
    },
    [setStored, setParam],
  );

  return [sort, setSort];
}
