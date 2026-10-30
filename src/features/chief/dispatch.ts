import { chiefForRegion } from "./types";
import type { ChiefOption } from "./types";

/**
 * Viloyatlar bo'yicha taqsimlash (2026-10-30, egasi qarori): logist
 * zakazni kuryerga emas, viloyat bosh kuryeriga beradi — kuryerni bosh
 * kuryer tanlaydi. Bu yerda faqat reja: zakazlar viloyat bo'yicha
 * guruhlanadi, har guruhga mos bosh kuryer qo'yiladi (logist almashtira
 * oladi). Yuborish — `{status: "shipping", chief_courier_id}`.
 */
export type DispatchOrder = {
  id: string;
  status: string;
  payableAmount: number;
  region: string | null;
};

export type DispatchGroup<T extends DispatchOrder> = {
  /** Viloyat kodi; aniqlanmagan — `""`. */
  region: string;
  orders: T[];
  amount: number;
  /** Viloyatga mos bosh kuryer (sukut); yo'q — `null`. */
  suggestedChiefId: number | null;
};

/** Faqat tasdiqlangan zakaz bosh kuryerga beriladi (`confirmed → shipping`). */
export function canDispatch(order: Pick<DispatchOrder, "status">): boolean {
  return order.status === "confirmed";
}

/** Guruhlar: viloyat nomi bo'yicha emas, zakaz soni ko'pi tepada; aniqlanmagani oxirida. */
export function groupByRegion<T extends DispatchOrder>(
  orders: readonly T[],
  /** Viloyat bo'yicha ro'yxat (`?region=` — `is_default` bilan); bo'lmasa umumiy. */
  chiefsOf: (region: string) => readonly ChiefOption[],
): DispatchGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const order of orders) {
    if (!canDispatch(order)) continue;
    const key = order.region?.trim() ?? "";
    groups.set(key, [...(groups.get(key) ?? []), order]);
  }
  return [...groups.entries()]
    .map(([region, list]) => ({
      region,
      orders: list,
      amount: list.reduce((sum, order) => sum + order.payableAmount, 0),
      suggestedChiefId: region ? (chiefForRegion(chiefsOf(region), region)?.id ?? null) : null,
    }))
    .sort((a, b) => Number(a.region === "") - Number(b.region === "") || b.orders.length - a.orders.length);
}

/**
 * Yakuniy reja: zakaz id → bosh kuryer id. Logist tanlovi (`overrides`,
 * viloyat → bosh kuryer) sukutdan ustun; bosh kuryersiz guruh yuborilmaydi.
 */
export function dispatchPlan<T extends DispatchOrder>(
  groups: readonly DispatchGroup<T>[],
  overrides: Readonly<Record<string, number | null>>,
): Map<string, number> {
  const plan = new Map<string, number>();
  for (const group of groups) {
    const chiefId = group.region in overrides ? overrides[group.region] : group.suggestedChiefId;
    if (chiefId === null || chiefId === undefined) continue;
    for (const order of group.orders) plan.set(order.id, chiefId);
  }
  return plan;
}
