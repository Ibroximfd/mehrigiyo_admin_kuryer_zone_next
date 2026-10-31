import type { Courier } from "@/features/couriers/types";
import type { LogistOrder } from "@/features/orders/types";

import type { AutoAssignPreviewRow, AutoAssignReason } from "./types";

/**
 * Avto-taqsimlash rejasi (§5a, 2-bosqich; backend V5): reja serverdan
 * (`auto-assign/preview/`), bosh kuryer uni ko'rib chiqadi — zona yoki
 * kuryerni almashtiradi, zakazni chiqaradi — va `apply/` bilan yuboradi.
 */
export type PlanRow = {
  order: LogistOrder;
  zoneId: number | null;
  courierId: number | null;
  /** Server sababi — kuryer topilmagan qatorlarda ko'rsatiladi. */
  reason: AutoAssignReason;
  /** Bosh kuryer ro'yxatdan chiqargan — yuborilmaydi. */
  excluded: boolean;
};

/** Server rejasi + zakaz kartasi; rejada yo'q zakaz qatorga tushmaydi. */
export function planFromPreview(rows: readonly AutoAssignPreviewRow[], orders: readonly LogistOrder[]): PlanRow[] {
  const byId = new Map(orders.map((order) => [order.id, order]));
  return rows.flatMap((row) => {
    const order = byId.get(row.orderId);
    if (!order) return [];
    return [{ order, zoneId: row.zone?.id ?? null, courierId: row.courier?.id ?? null, reason: row.reason, excluded: false }];
  });
}

export function couriersOfZone(couriers: readonly Courier[], zoneId: number | null): Courier[] {
  if (zoneId === null) return [];
  return couriers.filter((courier) => courier.isActive && courier.zoneIds.includes(zoneId));
}

/** Qo'lda zona almashtirilganda — shu zonaning smenadagi, eng kam yuklamali kuryeri. */
export function pickCourier(couriers: readonly Courier[], zoneId: number | null): Courier | null {
  return (
    [...couriersOfZone(couriers, zoneId)].sort(
      (a, b) => Number(b.live.onShift) - Number(a.live.onShift) || (a.load ?? 0) - (b.load ?? 0),
    )[0] ?? null
  );
}

/** Yuboriladigan qatorlar: chiqarilmagan va kuryeri tanlangan. */
export function readyRows(rows: readonly PlanRow[]): Array<PlanRow & { courierId: number }> {
  return rows.filter((row): row is PlanRow & { courierId: number } => !row.excluded && row.courierId !== null);
}

/**
 * Kuryer tanlovi: zona bo'lsa — shu zonaning kuryerlari, zonasiz — hamma faol
 * kuryer. Server tanlagan (yoki qo'lda tanlangan) kuryer ro'yxatda doim bor —
 * u boshqa zonadan bo'lsa ham tanlov bo'sh ko'rinmaydi.
 */
export function courierOptions(couriers: readonly Courier[], row: PlanRow): Courier[] {
  const pool = row.zoneId === null ? couriers.filter((courier) => courier.isActive) : couriersOfZone(couriers, row.zoneId);
  const current = couriers.find((courier) => courier.id === row.courierId);
  return current && !pool.includes(current) ? [current, ...pool] : pool;
}
