import { ORDER_STATUSES, orderStatusInfo } from "./types";
import type { LogistOrder, OrderStatus } from "./types";

/**
 * Logist qanday holat o'tishlariga haqli — `02_DOMAIN_MODEL` §2.3
 * matritsasining **logist ustuni**. Backend ham xuddi shu jadvalni
 * tekshiradi (`status_transition_forbidden`); bu yerdagi nusxa faqat UI
 * uchun — tugma va sudrash ruxsatsiz o'tishni umuman taklif qilmasin.
 *
 * O'tish turlari:
 *   direct  — bir bosishda (hozir matritsada yo'q, zaxira tur);
 *   deliver — `DeliverConfirmDialog`: `shipping → delivered` ikkinchi qadam
 *             tasdig'i bilan (`LOGIST_04` A4 — adashib tashlangan karta
 *             Bazaga ketmasin);
 *   ship    — `ShipOrderDialog`: kuryer majburiy + cheklist;
 *   cancel  — `CancelOrderDialog`: `cancel_reason` (+ izoh);
 *   revert  — `RevertOrderDialog`: orqaga qaytarish, `revert_reason` majburiy;
 *   restore — `RestoreOrderDialog`: bekor qilingandan tiklash, sabab bilan.
 *
 *   confirm — `ConfirmOrderDialog`: mijoz tasdig'ini chetlab `pending → confirmed`
 *             (sabab majburiy, `02` §2.3 logist ustuni "✅ (sabab)").
 *
 * Logist oqimi (2026-10-29): `pending` logistga ko'rinmaydi — u
 * operator/mijoz bosqichi. Logist `Tasdiqlangan` dan boshlaydi va har bir
 * buyurtma yakunlanishdan oldin **jarayondan** (`shipping`) o'tadi:
 * `Yetkazildi` ham, `Atkaz` ham faqat `shipping` dan, logistning o'z
 * tasdig'i bilan (kuryerga yoziladigan manzil soni ham shu oynada).
 *
 * Hech bir o'tish to'lov usuli/holatiga tegmaydi (`00` 2-qaror) — PATCH
 * tanasidan pul kalitlari `withoutPaymentKeys` bilan olib tashlanadi.
 */
export type TransitionKind =
  | "direct"
  | "deliver"
  | "ship"
  | "cancel"
  | "revert"
  | "restore"
  | "confirm";

const TRANSITIONS: Record<OrderStatus, Partial<Record<OrderStatus, TransitionKind>>> =
  {
    pending: {},
    confirmed: { shipping: "ship" },
    shipping: { delivered: "deliver", cancelled: "cancel", confirmed: "revert" },
    delivered: { shipping: "revert" },
    cancelled: { shipping: "restore", confirmed: "restore" },
  };

/** Oqimning tabiiy tartibi — "keyingi qadam" tugmasi shundan olinadi. */
export const FLOW = ["confirmed", "shipping", "delivered"] as const;

/**
 * Kartadagi "keyingi qadam" tugmasi matni — status nomi emas, harakat fe'li:
 * logist nima bo'lishini emas, nima qilishini o'qiydi.
 */
export const NEXT_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: "Bosh kuryerga berish",
  shipping: "Yetkazildi",
};

/** Joriy holatdan keyingi tabiiy qadam; oqim tugagan bo'lsa `null`. */
export function nextFlowStatus(current: string): string | null {
  const index = FLOW.indexOf(current as (typeof FLOW)[number]);
  if (index === -1 || index === FLOW.length - 1) return null;
  return FLOW[index + 1];
}

/** Oqim bo'yicha bir qadam orqaga; boshida bo'lsa `null`. */
export function previousFlowStatus(current: string): string | null {
  const index = FLOW.indexOf(current as (typeof FLOW)[number]);
  return index > 0 ? FLOW[index - 1] : null;
}

/** Aynan shu o'tish qanday yo'l bilan bajariladi; ruxsat yo'q — `null`. */
export function statusTransition(
  from: string,
  to: string,
): TransitionKind | null {
  if (from === to) return null;
  const row = TRANSITIONS[from as OrderStatus];
  return row?.[to as OrderStatus] ?? null;
}

/**
 * Doskadagi karta uchun o'tish: odatda status matritsasi. Operator atkaz
 * so'ragan `pending`/`confirmed` zakaz («Jarayonda», `review.ts`) — logist
 * uni atkazga yakunlaydi (backendning saqlangan yo'li, 2026-10-30 §A 2.2).
 */
export function boardTransition(
  order: Pick<LogistOrder, "status" | "review">,
  to: string,
): TransitionKind | null {
  if (
    order.review.outcome === "refused" &&
    (order.status === "pending" || order.status === "confirmed") &&
    to === "cancelled"
  ) {
    return "cancel";
  }
  return statusTransition(order.status, to);
}

/** Joriy holatdan qaysi holatlarga o'tish mumkin (matritsa tartibida). */
export function allowedStatusChanges(current: string): string[] {
  return ORDER_STATUSES.map((status) => status.value as string).filter(
    (status) => statusTransition(current, status) !== null,
  );
}

/** Aynan shu o'tish ruxsatlimi. */
export function canChangeStatus(from: string, to: string): boolean {
  return statusTransition(from, to) !== null;
}

/**
 * Sabab so'raladigan o'tishlar — dialogsiz yuborilsa backend
 * `cancel_reason_required` / `revert_reason_required` qaytaradi.
 */
export function transitionNeedsReason(kind: TransitionKind | null): boolean {
  return (
    kind === "cancel" || kind === "revert" || kind === "restore" || kind === "confirm"
  );
}

/**
 * O'tish oyna orqali bajariladimi (sabab yoki ikkinchi qadam tasdig'i) —
 * doska va detal bunday o'tishni darhol yubormaydi, `StatusChangeDialogs`
 * ga beradi. `ship` bunga kirmaydi: uning oynasi alohida (kuryer tanlovi).
 */
export function transitionNeedsDialog(kind: TransitionKind | null): boolean {
  return transitionNeedsReason(kind) || kind === "deliver";
}

/**
 * `pending → shipping` so'ralgan: tasdiqdan keyin yo'lga chiqarish oynasi.
 * Logist `pending` ni ko'rmagani uchun bu yo'l endi ochilmaydi; funksiya
 * eski chaqiruvchilar uchun qoldi va har doim `false`.
 */
export function needsShipAfterConfirm(from: string, to: string): boolean {
  return from === "pending" && to === "shipping" && statusTransition(from, to) !== null;
}

/** Undo so'rovi tanasi — `LogistOrderPatch` bilan bir xil shakl (api qatlami). */
export type UndoPatch = {
  status: string;
  revertReason?: string;
  cancelReason?: string;
  cancelNote?: string;
  note?: string;
};

const UNDO_NOTE = "5 soniyalik qaytarish (undo)";

/**
 * O'tishni orqaga qaytarish uchun PATCH: `from → to` bo'lgan edi, endi
 * `to → from`. Teskari o'tish sabab talab qilsa u avtomatik to'ldiriladi
 * (xato bosildi) — logist undo uchun sabab yozib o'tirmaydi. Teskari
 * o'tish matritsada bo'lmasa `null` — undo taklif qilinmaydi.
 */
export function undoPatch(from: string, to: string): UndoPatch | null {
  const kind = statusTransition(to, from);
  if (kind === null) return null;
  if (kind === "cancel") {
    return {
      status: from,
      cancelReason: "other",
      cancelNote: UNDO_NOTE,
    };
  }
  if (kind === "revert" || kind === "restore") {
    return { status: from, revertReason: "mistake", note: UNDO_NOTE };
  }
  return { status: from, note: UNDO_NOTE };
}

/**
 * Kartani sudrash mumkinmi (logist ko'radigan to'rt bosqichda).
 * Transfer javobini kutayotgan buyurtma ikkala filialda ham qulflangan (§4.8).
 */
export function canDragOrder(order: Pick<LogistOrder, "status" | "transfer">) {
  if (isTransferLocked(order)) return false;
  return orderStatusInfo(order.status).logistDraggable;
}

/** Transfer javobi kutilayotgan buyurtma tahrir/dragga qulflanadi. */
export function isTransferLocked(
  order: Pick<LogistOrder, "transfer">,
): boolean {
  const status = order.transfer?.status ?? "";
  return status === "pending_accept" || status === "requested";
}

/**
 * Yetkazish maydonlarini (kuryer, sana, izoh) tahrirlash mumkinmi.
 *
 * Logist har qanday bosqichda tahrirlaydi (`02` §2.4) — yetkazilgan
 * buyurtmaga keyin kuryer yoki izoh qo'shish kerak bo'lib qoladi. Faqat
 * transfer qulfi to'sadi.
 */
export function canEditDelivery(status: string): boolean {
  return Boolean(status);
}

/** "Yetkazib bo'lmadi" faqat `shipping` holatida (backend §4.5.2). */
export function canReportAttempt(status: string): boolean {
  return status === "shipping";
}

/** Faqat `confirmed` buyurtma boshqa filialga o'tkaziladi (§4.8). */
export function canTransferOrder(
  order: Pick<LogistOrder, "status" | "transfer">,
): boolean {
  if (isTransferLocked(order)) return false;
  return order.status === "confirmed";
}

/**
 * O'tish nima uchun yopiqligi — tugmani shunchaki yashirmasdan, sababini
 * aytish uchun.
 */
export function statusBlockedReason(
  order: Pick<LogistOrder, "status" | "transfer">,
): string | null {
  if (isTransferLocked(order)) {
    return "Buyurtma boshqa filialga o'tkazilmoqda — javob kutilmoqda";
  }
  return null;
}
