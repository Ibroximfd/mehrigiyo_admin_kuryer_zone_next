"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

import { useUiStore, type OrdersView } from "@/stores/ui-store";

const VIEWS = ["board", "list"] as const;

/**
 * Buyurtmalar sahifasining ko'rinishi — doska yoki jadval.
 *
 * Ikki joyda saqlanadi va shuning uchun ikkala kutilgan xatti-harakat ham
 * ishlaydi:
 *   • URL (`?view=list`) — havolani ulashganda yoki orqaga qaytganda o'sha
 *     ko'rinish ochiladi;
 *   • `localStorage` — havolasiz kirilganda oxirgi tanlov tiklanadi.
 *
 * URL ustun turadi; parametr bo'lmasa saqlangan tanlov, u ham bo'lmasa
 * doska (default) ishlatiladi.
 */
export function useOrdersView(): [OrdersView, (view: OrdersView) => void] {
  const stored = useUiStore((state) => state.ordersView);
  const setStored = useUiStore((state) => state.setOrdersView);

  const [param, setParam] = useQueryState(
    "view",
    parseAsStringLiteral(VIEWS).withOptions({ clearOnDefault: false }),
  );

  const view = param ?? stored;

  const setView = (next: OrdersView) => {
    setStored(next);
    void setParam(next);
  };

  return [view, setView];
}
