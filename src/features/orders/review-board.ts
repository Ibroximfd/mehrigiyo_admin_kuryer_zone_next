import type { OrderBoardColumn, OrdersBoard } from "./board";
import { REVIEW_COLUMN, boardColumnOf, isInReview } from "./review";
import type { LogistOrder } from "./types";

/** «Jarayonda» ustunining ko'rinishi (rang tokenlari `globals.css`). */
export const REVIEW_INFO = {
  label: "Jarayonda",
  color: "var(--order-review)",
  mark: "var(--order-review-mark)",
} as const;

/**
 * Doskaning ko'rinadigan ustunlari: Tasdiqlangan → Yo'lda → **Jarayonda** →
 * Yetkazilgan → Atkaz.
 *
 * Backend (2026-10-30 javoblari §1) `review` ustunini o'zi beradi — son,
 * summa va sahifalash serverniki. Kesh ustunlari statuslar bo'yicha
 * qoladi; har karta shu yerda **o'z** ustuniga qo'yiladi (`boardColumnOf`):
 * WS yamog'idan keyin natijasi o'zgargan karta (kuryer «yetkazdim» bosdi
 * yoki logist orqaga qaytardi) qayta yuklashsiz to'g'ri ustunga o'tadi,
 * sonlar ham shunga qarab siljiydi. Eski backend `review` bermasa —
 * ustun yuklangan kartalardan yig'iladi (avvalgi xatti-harakat).
 */
export function withReviewColumn(
  board: Pick<OrdersBoard<LogistOrder>, "columns" | "pendingPool">,
): OrderBoardColumn<LogistOrder>[] {
  const serverReview = board.columns.find((column) => column.status === REVIEW_COLUMN);
  const base = board.columns.filter((column) => column.status !== REVIEW_COLUMN);
  const review: OrderBoardColumn<LogistOrder> = serverReview
    ? { ...serverReview, ...REVIEW_INFO, label: serverReview.label || REVIEW_INFO.label }
    : { status: REVIEW_COLUMN, ...REVIEW_INFO, count: 0, totalAmount: 0, orders: [] };
  const columns = [...base, review];

  // Har karta qayerda bo'lishi kerak; takrorlar (WS + javob) bitta.
  const seen = new Set<string>();
  const incoming = new Map<string, LogistOrder[]>();
  const outgoing = new Map<string, LogistOrder[]>();
  const place = (from: string, order: LogistOrder) => {
    if (seen.has(order.id)) {
      outgoing.set(from, [...(outgoing.get(from) ?? []), order]);
      return;
    }
    seen.add(order.id);
    const to = boardColumnOf(order);
    if (to === from) return;
    if (!columns.some((column) => column.status === to)) return;
    outgoing.set(from, [...(outgoing.get(from) ?? []), order]);
    incoming.set(to, [...(incoming.get(to) ?? []), order]);
  };
  for (const column of columns) for (const order of column.orders) place(column.status, order);
  // `pending` ustuni chizilmaydi — undan faqat operator atkazi «Jarayonda» ga.
  for (const order of board.pendingPool ?? []) {
    if (!seen.has(order.id) && isInReview(order)) {
      seen.add(order.id);
      incoming.set(REVIEW_COLUMN, [...(incoming.get(REVIEW_COLUMN) ?? []), order]);
    }
  }

  const sum = (orders: readonly LogistOrder[]) => orders.reduce((total, order) => total + order.payableAmount, 0);
  const result = columns.map((column) => {
    const out = outgoing.get(column.status) ?? [];
    const into = incoming.get(column.status) ?? [];
    if (out.length === 0 && into.length === 0) return column;
    const outIds = new Set(out.map((order) => order.id));
    const kept = column.orders.filter((order) => !outIds.has(order.id));
    const orders = column.status === REVIEW_COLUMN ? byRequestedAt([...kept, ...into]) : [...into, ...kept];
    return {
      ...column,
      orders,
      count: Math.max(0, column.count - out.length + into.length),
      totalAmount: column.totalAmount === null ? null : Math.max(0, column.totalAmount - sum(out) + sum(into)),
    };
  });

  const reviewColumn = result.pop()!;
  const at = result.findIndex((column) => column.status === "shipping");
  return at === -1 ? [...result, reviewColumn] : [...result.slice(0, at + 1), reviewColumn, ...result.slice(at + 1)];
}

/** Eng eski so'rov tepada (logist navbat bilan yakunlaydi), vaqtsizlar oxirida. */
function byRequestedAt(orders: LogistOrder[]): LogistOrder[] {
  return [...orders].sort(
    (a, b) =>
      (a.review.requestedAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
      (b.review.requestedAt?.getTime() ?? Number.MAX_SAFE_INTEGER),
  );
}
