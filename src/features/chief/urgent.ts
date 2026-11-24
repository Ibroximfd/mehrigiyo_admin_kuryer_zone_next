import { mapLogistOrder } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import type { OrderUrgent, UrgentPerson } from "@/features/orders/urgent";
import { ApiError } from "@/lib/api-client";
import { asArray, asInt, asRecord } from "@/lib/parse";

/**
 * Bosh kuryerning shoshilinch zakazlari (hujjat 123 §4) — sof mantiq: javobni
 * o'qish, kim tasdiq kutyapti, bosqich yorlig'i, signal qachon chalinadi.
 * Tarmoq — `api.ts`, so'rov va kesh — `use-urgent-orders.ts`.
 */

/** Bu saytda soket yo'q — ro'yxat shu oraliqda so'raladi (§4). */
export const URGENT_POLL_MS = 15_000;
/** Hali bir marta ham javob olinmagan va server xato beryapti — sekinroq qayta uriniladi. */
export const URGENT_RETRY_MS = 60_000;
/** Tasdiqlanmagan zakaz bor ekan signal shu oraliqda takrorlanadi. */
export const URGENT_ALARM_MS = 20_000;
/** Server `reminder_after_minutes` ni bermasa (§6.2 sukuti). */
const DEFAULT_REMINDER_MINUTES = 10;

/** Faol shoshilinch zakaz — `urgent` aniq bor. */
export type UrgentOrder = LogistOrder & { urgent: OrderUrgent };

export type UrgentBoard = {
  /** Faol shoshilinchlar: avval tasdiqlanmaganlar, keyin eski birinchi. */
  orders: UrgentOrder[];
  /** Necha daqiqada tasdiqlanmasa server logistga xabar beradi. */
  reminderAfterMinutes: number;
};

export function isActiveUrgent(order: LogistOrder): order is UrgentOrder {
  return order.urgent !== null && order.urgent.isActive;
}

/** Bosh kuryer hali «Qabul qildim» bosmagan. */
export function awaitsAck(order: UrgentOrder): boolean {
  return order.urgent.ackedAt === null;
}

function setTime(order: UrgentOrder): number {
  return order.urgent.setAt?.getTime() ?? 0;
}

/** Server tartibi (§4.1) — optimistik tasdiqdan keyin ham saqlansin. */
function sortUrgent(orders: UrgentOrder[]): UrgentOrder[] {
  return [...orders].sort(
    (a, b) => Number(awaitsAck(b)) - Number(awaitsAck(a)) || setTime(a) - setTime(b),
  );
}

/**
 * `GET chief/orders/urgent/` (§4.1). Sanagichlar ro'yxatdan hisoblanadi
 * (`urgentCounts`) — ro'yxat to'liq keladi, optimistik tasdiqda ham mos turadi.
 */
export function mapUrgentBoard(raw: unknown): UrgentBoard {
  const json = asRecord(raw);
  const orders = asArray(json.orders ?? json.results).map(mapLogistOrder).filter(isActiveUrgent);
  const minutes = asInt(json.reminder_after_minutes, DEFAULT_REMINDER_MINUTES);
  return {
    orders: sortUrgent(orders),
    reminderAfterMinutes: minutes > 0 ? minutes : DEFAULT_REMINDER_MINUTES,
  };
}

export type UrgentCounts = { total: number; unacked: number };

export function urgentCounts(orders: readonly UrgentOrder[]): UrgentCounts {
  return { total: orders.length, unacked: orders.filter(awaitsAck).length };
}

/** Zakaz qaysi bosqichda: tasdiq kutyapti → kuryer kutyapti → kuryerda. */
export type UrgentStage = "unacked" | "acked" | "with_courier";

export function urgentStage(order: UrgentOrder): UrgentStage {
  if (awaitsAck(order)) return "unacked";
  return order.courier ? "with_courier" : "acked";
}

/** Kartadagi holat yozuvi. Kuryer ismi alohida chiziladi (tarjima qilinmaydi). */
export const URGENT_STAGE_LABELS: Record<UrgentStage, string> = {
  unacked: "Qabul qilinmagan",
  acked: "Qabul qilindi — kuryerga bering",
  with_courier: "Kuryerda",
};

/** Necha vaqt oldin shoshilinch qilingan — banner va karta uchun. */
export function urgentAgo(setAt: Date | null, now: Date): string {
  if (!setAt) return "";
  const minutes = Math.floor((now.getTime() - setAt.getTime()) / 60_000);
  if (minutes < 1) return "hozirgina";
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  return `${Math.floor(minutes / 60)} soat oldin`;
}

// ── Kesh ustidagi o'zgarishlar ───────────────────────────────────────────────

/** «Qabul qildim» darhol ko'rinsin — server javobini kutmasdan. */
export function withAck(board: UrgentBoard, orderId: string, by: UrgentPerson, at: Date): UrgentBoard {
  return {
    ...board,
    orders: sortUrgent(
      board.orders.map((order) =>
        order.id === orderId && awaitsAck(order)
          ? { ...order, urgent: { ...order.urgent, ackedAt: at, ackedBy: by } }
          : order,
      ),
    ),
  };
}

/** Tasdiq serverga yetmadi — optimistik belgi qaytariladi (boshqa zakazlarga tegmasdan). */
export function withoutAck(board: UrgentBoard, orderId: string): UrgentBoard {
  return {
    ...board,
    orders: sortUrgent(
      board.orders.map((order) =>
        order.id === orderId ? { ...order, urgent: { ...order.urgent, ackedAt: null, ackedBy: null } } : order,
      ),
    ),
  };
}

/** Server qaytargan zakaz: faol shoshilinch bo'lsa almashtiriladi, aks holda ro'yxatdan chiqadi. */
export function withOrder(board: UrgentBoard, next: LogistOrder): UrgentBoard {
  const others = board.orders.filter((order) => order.id !== next.id);
  const known = others.length !== board.orders.length;
  return {
    ...board,
    orders: isActiveUrgent(next) && known ? sortUrgent([...others, next]) : others,
  };
}

export function withoutOrder(board: UrgentBoard, orderId: string): UrgentBoard {
  return { ...board, orders: board.orders.filter((order) => order.id !== orderId) };
}

// ── Signal ───────────────────────────────────────────────────────────────────

/** Tasdiq kutayotganlardan hali ko'rilmaganlari — yangi kelganda darhol signal va bildirishnoma. */
export function freshUnacked(known: ReadonlySet<string>, orders: readonly UrgentOrder[]): UrgentOrder[] {
  return orders.filter((order) => awaitsAck(order) && !known.has(order.id));
}

/** Tasdiqlanmagan zakaz bor ekan signal `URGENT_ALARM_MS` da bir chalinadi. */
export function alarmDue(unacked: number, lastRangAt: number | null, now: number): boolean {
  if (unacked === 0) return false;
  return lastRangAt === null || now - lastRangAt >= URGENT_ALARM_MS;
}

// ── Server funksiyani biladimi ───────────────────────────────────────────────

/**
 * Xato «server shoshilinch zakazni bilmaydi» deganimi (§11). Eski serverda
 * `chief/orders/urgent/` manzili yo'q — `404` (prodda 2026-11-24 tekshirilgan),
 * boshqa usul uchun ochilgan bo'lsa `405`. Shunda so'rov butunlay to'xtaydi.
 *
 * `5xx` va tarmoq xatosi HECH QACHON «yo'q» emas: deploy paytidagi bir martalik
 * `502` bosh kuryerning signalini butun seans uchun o'chirib qo'ymasin — so'rov
 * davom etadi (birinchi javobgacha sekinroq, `URGENT_RETRY_MS`).
 */
export function isUrgentUnsupported(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return error.status === 404 || error.status === 405;
}

/** `409 not_urgent` — logist belgini olib tashlagan; `404` — zakaz endi bu bosh kuryerda emas (§4.2). */
export function isAckGone(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return error.status === 404 || (error.status === 409 && error.code === "not_urgent");
}
