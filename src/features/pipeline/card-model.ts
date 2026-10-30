import { isOpenChangeRequest } from "@/features/orders/change-request";
import type { PaymentFacts } from "@/features/orders/types";

import { isOpenStatus } from "./types";
import type { PipelineLead, PipelineOrder } from "./types";

/**
 * Dostavka kartasining hisob-kitoblari — sof funksiyalar, komponent faqat
 * chizadi. Hamma narsa kartadagi ma'lumotdan: qo'shimcha so'rov yo'q.
 */

/** `paymentView` uchun faktlar — to'lov holati taxminsiz shu yerdan. */
export function paymentFactsOf(order: PipelineOrder): PaymentFacts {
  return {
    isPaid: order.isPaid,
    paymentStatus: order.paymentStatus,
    paidAt: order.paidAt,
    paidAmount: null,
    paymentMethod: order.paymentMethod,
    payableAmount: order.payableAmount,
    status: order.status,
  };
}

/** Ochiq buyurtmalar — eng yangisi birinchi (server tartibi saqlanadi). */
export function openOrders(lead: Pick<PipelineLead, "orders">): PipelineOrder[] {
  return lead.orders.filter((order) => isOpenStatus(order.status));
}

/** Ochiq buyurtmalar soni va to'lanadigan jami summasi. */
export function openTotals(lead: Pick<PipelineLead, "orders">): { count: number; payable: number } {
  const open = openOrders(lead);
  return { count: open.length, payable: open.reduce((sum, order) => sum + order.payableAmount, 0) };
}

/**
 * Karta ustunda qachondan beri turibdi: ustunni belgilagan (eng yangi
 * ochiq) buyurtmaning `status_changed_at` i, bo'lmasa o'sha buyurtma
 * yaratilgan payt. Buyurtmasi bo'lmagan karta (Baza) — lidning status vaqti.
 *
 * ⚠️ Buyurtma bor kartada lidning `status_changed_at` i OLINMAYDI: u Lidlar
 * bosqichidagi eski vaqt (masalan 12 kun oldin) va bugun yaratilgan zakazni
 * "12 kun turibdi" deb ko'rsatardi.
 */
export function columnSince(
  lead: Pick<PipelineLead, "orders" | "statusChangedAt">,
): Date | null {
  const head = openOrders(lead)[0] ?? lead.orders[0];
  if (head) return head.statusChangedAt ?? head.createdAt ?? null;
  return lead.statusChangedAt ?? null;
}

/** "12 daq" · "3 soat" · "2 kun" — ustunda turgan vaqt, qisqa. */
export function formatDwell(since: Date, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - since.getTime()) / 60_000));
  if (minutes < 60) return `${Math.max(1, minutes)} daq`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat`;
  return `${Math.floor(hours / 24)} kun`;
}

/**
 * «Yetkazildi» kartasi: Bazaga qancha qoldi (`handover_at`). `null` —
 * server vaqt bermagan; muddat o'tgan — «Bazaga o'tmoqda» (fon vazifasi).
 */
export function handoverLeft(handoverAt: Date | null, now: Date): string | null {
  if (!handoverAt) return null;
  const minutes = Math.floor((handoverAt.getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) return "Bazaga o'tmoqda";
  if (minutes < 60) return `Bazaga ${minutes} daq`;
  const hours = Math.floor(minutes / 60);
  return `Bazaga ${hours} soat ${minutes % 60} daq`;
}

/** Shuncha soatdan ko'p turgan karta ajratiladi (sarg'ish vaqt belgisi). */
export const STALE_DWELL_HOURS = 24;

export function isStaleDwell(since: Date, now: Date): boolean {
  return now.getTime() - since.getTime() >= STALE_DWELL_HOURS * 3_600_000;
}

/** Ochiq buyurtmaning yetkazish sanasi o'tib ketgan (`YYYY-MM-DD` < bugun). */
export function isDeliveryOverdue(
  order: Pick<PipelineOrder, "status" | "deliveryDate">,
  todayKey: string,
): boolean {
  return isOpenStatus(order.status) && order.deliveryDate !== null && order.deliveryDate < todayKey;
}

/**
 * Kuryeri yo'q ochiq buyurtma — `confirmed` da bu logistning navbatdagi
 * ishi (ko'zga tashlanadigan belgi); `pending` da hali erta.
 */
export function needsCourier(order: Pick<PipelineOrder, "status" | "courier">): boolean {
  return order.courier === null && (order.status === "confirmed" || order.status === "shipping");
}

export type CardSignals = {
  /** Kuryerning ochiq eshikdagi o'zgarish so'rovi bor. */
  changeRequest: boolean;
  /** Bir to'xtashdagi eng katta guruh — "1 manzil · N zakaz"; yo'q — `null`. */
  stopGroupSize: number | null;
  /** Ochiq buyurtmalar ko'p — "+N zakaz" (birinchisidan tashqari). */
  extraOpen: number;
};

export function cardSignals(lead: Pick<PipelineLead, "orders">): CardSignals {
  const open = openOrders(lead);
  const stops = new Map<number, number>();
  for (const order of open) {
    if (order.stopId !== null) stops.set(order.stopId, (stops.get(order.stopId) ?? 0) + 1);
  }
  const largest = Math.max(0, ...stops.values());
  return {
    changeRequest: lead.orders.some((order) => isOpenChangeRequest(order.changeRequest)),
    stopGroupSize: largest >= 2 ? largest : null,
    extraOpen: Math.max(0, open.length - 1),
  };
}
