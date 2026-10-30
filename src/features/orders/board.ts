import {
  asArray,
  asInt,
  asOptionalNumber,
  asOptionalString,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";

import { insertByOrdering } from "./order-sort";
import {
  LOGIST_STATUSES,
  ORDER_STATUSES,
  UNKNOWN_STATUS,
  normalizeStatus,
  orderStatusInfo,
} from "./types";
import type { LogistOrder } from "./types";

/**
 * Buyurtmalar doskasi — bitta ustun va butun doska.
 *
 * Ikkala rol ham shu shaklda ishlaydi: admin uni bitta so'rovda oladi
 * (`admin/orders/board/`), sotuvchi esa ustunma-ustun yig'adi. Natijada
 * kesh, optimistik yangilash va real vaqt yamog'i — hammasi bitta.
 */

/** Har bir ustunda nechta buyurtma yuklanadi (backend chegarasi — 50). */
export const BOARD_LIMIT = 20;

export type OrderBoardColumn<TOrder> = {
  /** Mashina statusi — ustun shu bilan taniladi. */
  status: string;
  /** Ko'rinadigan nom: backend bergani, bo'lmasa mahalliy tarjima. */
  label: string;
  /** Matn/yorliq rangi — to'q, AA. */
  color: string;
  /** Belgi rangi — chiziq, nuqta, ustun fonlari uchun yorqin ohang. */
  mark: string;
  /** Ustundagi **jami** buyurtmalar — yuklangandan ko'p bo'lishi mumkin. */
  count: number;
  /**
   * Ustun bo'yicha jami summa (butun ustun) — mijoz **to'laydigan**
   * summa (`total_payable_amount`); backend faqat `total_amount` bersa
   * o'sha. Hech biri bo'lmasa `null`.
   */
  totalAmount: number | null;
  orders: TOrder[];
};

export type OrdersBoard<TOrder> = {
  columns: OrderBoardColumn<TOrder>[];
  /**
   * Yuklab bo'lmagan ustunlar (2026-10-01 C §15.2: mijozsiz buyurtma
   * serializerni `500` bilan yiqitadi). Qolgan ustunlar chiziladi, ekran
   * buni ochiq aytadi. Yo'q yoki bo'sh — hammasi yuklangan.
   */
  failedStatuses?: string[];
  /**
   * `pending` ustunining kartalari — doskada chizilmaydi, faqat operator
   * atkaz so'raganlari («Jarayonda», `review.ts`) shu yerdan olinadi.
   */
  pendingPool?: TOrder[];
};

// ─────────────────────────────────────────────────────────────────────────────
// O'qish
// ─────────────────────────────────────────────────────────────────────────────

function emptyColumn<TOrder>(status: string): OrderBoardColumn<TOrder> {
  const info = orderStatusInfo(status);
  return {
    status,
    label: info.label,
    color: info.color,
    mark: info.mark,
    count: 0,
    totalAmount: null,
    orders: [],
  };
}

/**
 * `admin/orders/board/` javobi.
 *
 * Ustunlar backend tartibiga emas, `ORDER_STATUSES` ga qarab quriladi:
 * backend bittasini yubormay qolsa ham doskadan ustun yo'qolmaydi va
 * ustunlar joyini almashtirmaydi. Notanish status kelsa oxiriga qo'shiladi.
 */
export function mapOrdersBoard<TOrder>(
  raw: unknown,
  mapOrder: (raw: unknown) => TOrder,
): OrdersBoard<TOrder> {
  const byStatus = new Map<string, OrderBoardColumn<TOrder>>();

  for (const item of asArray(asRecord(raw).columns)) {
    const json = asRecord(item);
    const rawStatus = asString(json.status);
    if (!rawStatus) continue;

    /*
     * 2026-10-01 dan statuslar beshta (§2): `confirming`/`paid`/`preparing`
     * yangi buyurtmada hech qachon kelmaydi. Keshlangan yoki eski deploy
     * javobi ularni yuborsa — kanonik statusga o'qiladi, ustuni ham o'shanga
     * qo'shiladi (aks holda alohida "noma'lum" ustun bo'lib qolardi).
     */
    const normalized = normalizeStatus(rawStatus);
    const canonical = normalized === UNKNOWN_STATUS ? rawStatus : normalized;
    const orders = asArray(json.orders).map(mapOrder);
    const count = asInt(json.count, orders.length);
    const totalAmount = asOptionalNumber(
      json.total_payable_amount ?? json.total_amount,
    );
    const existing = byStatus.get(canonical);

    if (existing) {
      byStatus.set(canonical, {
        ...existing,
        count: existing.count + count,
        totalAmount:
          existing.totalAmount === null && totalAmount === null
            ? null
            : (existing.totalAmount ?? 0) + (totalAmount ?? 0),
        orders: [...existing.orders, ...orders],
      });
      continue;
    }

    byStatus.set(canonical, {
      ...emptyColumn<TOrder>(canonical),
      label:
        (canonical === rawStatus ? asOptionalString(json.label) : null) ??
        orderStatusInfo(canonical).label,
      count,
      totalAmount,
      orders,
    });
  }

  // `pending` ustuni logistga chizilmaydi (2026-10-29) — eski backend
  // yuborsa ham tashlanadi: u `known` da ham, `extra` da ham yo'q.
  const known = LOGIST_STATUSES.map(
    (status) => byStatus.get(status.value) ?? emptyColumn<TOrder>(status.value),
  );
  const extra = [...byStatus.values()].filter(
    (column) =>
      !ORDER_STATUSES.some((status) => status.value === column.status),
  );

  // Ustun ichidagi tartib — serverniki (`?ordering=`, 2026-10-01 C §8):
  // qayta saralanmaydi.
  const pendingPool = byStatus.get("pending")?.orders ?? [];
  return pendingPool.length
    ? { columns: [...known, ...extra], pendingPool }
    : { columns: [...known, ...extra] };
}

/**
 * Doskadagi har bir ustun oxirigacha yuklanganmi.
 *
 * Shu rost bo'lsa, doskada ko'rinmayotgan buyurtma bu doskaning filtriga
 * umuman tushmaydi (yashiringan qism yo'q) — real vaqt hodisasi kelganda
 * uni qayta yuklash shart emasligini shundan bilamiz.
 */
export function isBoardFullyLoaded(board: OrdersBoard<unknown>): boolean {
  return board.columns.every((column) => column.orders.length >= column.count);
}

export function isOrdersBoard(value: unknown): value is OrdersBoard<unknown> {
  return isRecord(value) && Array.isArray(value.columns);
}

// ─────────────────────────────────────────────────────────────────────────────
// Optimistik yangilash
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Buyurtmani boshqa ustunga ko'chirilgan holda qaytaradi — hisoblagich va
 * summa ham birga siljiydi.
 *
 * `null` — qo'llab bo'lmadi (buyurtma keshda yo'q yoki bunday ustun yo'q):
 * chaqiruvchi bunda doskani serverdan qayta oladi.
 */
export function moveOrderInBoard<TOrder extends LogistOrder>(
  board: OrdersBoard<TOrder>,
  orderId: string,
  toStatus: string,
  {
    ordering,
    at = new Date(),
  }: {
    /** Shu doska so'ralgan `?ordering=` — karta shu qoida bo'yicha joylanadi. */
    ordering: string;
    /**
     * Statusga kirgan payt: WS hodisasida serverning `changed_at` i,
     * optimistik ko'chirishda — hozir. Server aks-sadosi (`status_changed_at`)
     * kelganda kartochka shu qiymatni almashtiradi.
     */
    at?: Date;
  },
): OrdersBoard<TOrder> | null {
  const target = board.columns.find((column) => column.status === toStatus);
  if (!target) return null;

  const source = board.columns.find((column) =>
    column.orders.some((order) => order.id === orderId),
  );
  if (!source) return null;
  // Allaqachon o'sha ustunda — masalan o'z o'zgarishimizning WS aks-sadosi.
  if (source.status === toStatus) return board;

  const order = source.orders.find((item) => item.id === orderId) as TOrder;
  const moved = {
    ...order,
    status: toStatus,
    statusDisplay: target.label,
    statusChangedAt: at,
    // Yangi ustundagi qo'lda tartib noma'lum — server javobigacha qatlam o'tkaziladi.
    boardPosition: null,
  };

  return {
    ...board,
    columns: board.columns.map((column) => {
      if (column.status === source.status) {
        return {
          ...column,
          orders: column.orders.filter((item) => item.id !== orderId),
          count: Math.max(0, column.count - 1),
          // Ustun summasi — to'lanadigan summa, mol summasi emas.
          totalAmount: shiftAmount(column.totalAmount, -order.payableAmount),
        };
      }

      if (column.status === toStatus) {
        return {
          ...column,
          // Server tartibining o'zi bilan joylanadi: `-status_changed_at` da
          // hozirgina kirgan karta qadalganlardan keyin birinchi bo'ladi.
          orders: insertByOrdering(
            column.orders,
            moved,
            ordering,
            column.orders.length < column.count,
          ),
          count: column.count + 1,
          totalAmount: shiftAmount(column.totalAmount, order.payableAmount),
        };
      }

      return column;
    }),
  };
}

function shiftAmount(total: number | null, delta: number): number | null {
  return total === null ? null : Math.max(0, total + delta);
}

/**
 * Serverdan kelgan buyurtma bilan kartochkani almashtiradi (ustunni
 * o'zgartirmasdan).
 *
 * Nega kerak: `moveOrderInBoard` kartochkani **eski** maydonlari bilan
 * ko'chiradi, PATCH javobi esa yangilangan buyurtmani qaytaradi (tasdiq,
 * bekor sababi, `shipped_at`, to'lov holati…). Server javobi keshga
 * yozilmasa kartochka eskirgan nishonchalar bilan qolib ketardi.
 *
 * `null` — bunday buyurtma doskada yo'q (chaqiruvchi hech narsa qilmaydi).
 */
export function patchOrderInBoard<TOrder extends LogistOrder>(
  board: OrdersBoard<TOrder>,
  updated: TOrder,
): OrdersBoard<TOrder> | null {
  let found = false;

  const columns = board.columns.map((column) => {
    if (!column.orders.some((order) => order.id === updated.id)) return column;
    found = true;
    return {
      ...column,
      orders: column.orders.map((order) =>
        order.id === updated.id
          ? // Ustun sarlavhasi joyida qolsin: kartochka allaqachon shu
            // ustunda va server statusi u bilan bir xil.
            { ...updated, statusDisplay: order.statusDisplay }
          : order,
      ),
    };
  });

  return found ? { ...board, columns } : null;
}
