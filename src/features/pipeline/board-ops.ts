import { DELIVERY_PAGE_SIZE, deliveryColumnOf, isOpenStatus } from "./types";
import type { PipelineBoard, PipelineColumn, PipelineLead, PipelineOrder } from "./types";

/**
 * Doska ustida sof amallar — sahifalash va real vaqt yamog'i.
 *
 * Har biri o'zgarish bo'lmasa **o'sha obyektni** qaytaradi: TanStack
 * keshiga yozish va memo'langan kartalar sababsiz qayta chizilmaydi.
 * Karta qo'shilganda/olinganda ustun `total` i ham birga siljiydi —
 * sarlavhadagi son serverga qayta bormasdan to'g'ri qoladi.
 */

/** Ustunda serverda yana karta bormi ("yana N ta"). */
export function columnHasMore(column: Pick<PipelineColumn, "leads" | "total">): boolean {
  return column.leads.length < column.total;
}

/** Server bitta ustunga beradigan eng ko'p karta (`?limit=` max). */
export const MAX_COLUMN_LIMIT = 500;

/**
 * Qayta yuklash (yangilash, qayta ulanish, oynaga qaytish) uchun `?limit=`:
 * logist pastga surib ochgan ustun 50 taga qisqarib qolmasin — eng chuqur
 * ochilgan ustun 50 ga yaxlitlanadi (max 500). Kesh yo'q — sukut 50.
 */
export function refetchLimit(board: Pick<PipelineBoard, "columns"> | null | undefined): number {
  const deepest = Math.max(0, ...(board?.columns.map((column) => column.leads.length) ?? []));
  const pages = Math.max(1, Math.ceil(deepest / DELIVERY_PAGE_SIZE));
  return Math.min(MAX_COLUMN_LIMIT, pages * DELIVERY_PAGE_SIZE);
}

/** Ustunning keyingi sahifasi uchun `offset` (yuklangan kartalar soni). */
export function columnOffset(column: Pick<PipelineColumn, "leads">): number {
  return column.leads.length;
}

/**
 * `?offset=N` bilan kelgan sahifadan faqat **shu ustun** olinadi va
 * oxiriga qo'shiladi. Server har ustunni alohida kesadi, ya'ni boshqa
 * ustunlarning shu sahifadagi kartalari kerak emas. Takror (WS bilan
 * allaqachon qo'shilgan) karta ikki marta chiqmaydi.
 */
export function appendColumnPage(
  board: PipelineBoard,
  columnKey: string,
  page: PipelineBoard,
): PipelineBoard {
  const incoming = page.columns.find((column) => column.key === columnKey);
  if (!incoming) return board;

  return mapColumn(board, columnKey, (column) => {
    const known = new Set(column.leads.map((lead) => lead.id));
    const fresh = incoming.leads.filter((lead) => !known.has(lead.id));
    if (fresh.length === 0 && incoming.total === column.total) return column;
    return {
      ...column,
      total: Math.max(incoming.total, column.leads.length + fresh.length),
      leads: [...column.leads, ...fresh],
    };
  });
}

/** Kartani doskadan olib tashlaydi (bo'limdan chiqdi). */
export function removeLead(board: PipelineBoard, leadId: number): PipelineBoard {
  let touched = false;
  const columns = board.columns.map((column) => {
    if (!column.leads.some((lead) => lead.id === leadId)) return column;
    touched = true;
    return {
      ...column,
      total: Math.max(0, column.total - 1),
      leads: column.leads.filter((lead) => lead.id !== leadId),
    };
  });
  if (!touched) return board;
  return { ...board, totalLeads: Math.max(0, board.totalLeads - 1), columns };
}

/**
 * Kartani ustun tepasiga qo'yadi (yangi kelgan yoki ko'chgan). Avvalgi
 * joyidan olinadi. Ustun doskada yo'q bo'lsa (masalan Bazada yangi status)
 * `null` — chaqiruvchi doskani qayta so'raydi.
 */
export function placeLead(
  board: PipelineBoard,
  lead: PipelineLead,
  columnKey: string,
): PipelineBoard | null {
  if (!board.columns.some((column) => column.key === columnKey)) return null;
  // Ko'chishda `removeLead` jami sonni kamaytiradi, bu yerda qaytadi — net 0.
  const without = removeLead(board, lead.id);

  return {
    ...without,
    totalLeads: without.totalLeads + 1,
    columns: without.columns.map((column) =>
      column.key === columnKey
        ? { ...column, total: column.total + 1, leads: [lead, ...column.leads] }
        : column,
    ),
  };
}

/** Buyurtma qaysi lid kartasida turibdi. */
export function findLeadByOrder(
  board: PipelineBoard,
  orderId: string,
): { lead: PipelineLead; columnKey: string } | null {
  for (const column of board.columns) {
    const lead = column.leads.find((item) =>
      item.orders.some((order) => order.id === orderId),
    );
    if (lead) return { lead, columnKey: column.key };
  }
  return null;
}

/**
 * Buyurtma statusi o'zgardi (`order_status_changed`) — Dostavka doskasida
 * faqat shu buyurtma turgan BITTA karta yamaladi: buyurtma holati
 * yangilanadi, ustun qaytadan hisoblanadi (eng yangi ochiq buyurtma).
 * Ochiq buyurtma qolmasa karta chiqadi. Buyurtma doskada bo'lmasa —
 * o'sha doska (server `lead_stage_changed` bilan kartani olib keladi).
 */
export function applyOrderStatus(
  board: PipelineBoard,
  orderId: string,
  status: string,
): PipelineBoard {
  const found = findLeadByOrder(board, orderId);
  if (!found) return board;
  const { lead, columnKey } = found;
  const current = lead.orders.find((order) => order.id === orderId);
  if (!current || current.status === status) return board;

  const orders = lead.orders.map((order) =>
    order.id === orderId ? { ...order, status } : order,
  );
  const target = deliveryColumnOf(orders);
  if (target === null) return removeLead(board, lead.id);

  const next: PipelineLead = {
    ...lead,
    orders,
    deliveryColumn: target,
    openOrdersCount: orders.filter((order) => isOpenStatus(order.status)).length,
  };
  if (target === columnKey) {
    return mapColumn(board, columnKey, (column) => ({
      ...column,
      leads: column.leads.map((item) => (item.id === lead.id ? next : item)),
    }));
  }
  return placeLead(board, next, target) ?? removeLead(board, lead.id);
}

function mapColumn(
  board: PipelineBoard,
  columnKey: string,
  update: (column: PipelineColumn) => PipelineColumn,
): PipelineBoard {
  let touched = false;
  const columns = board.columns.map((column) => {
    if (column.key !== columnKey) return column;
    const next = update(column);
    if (next !== column) touched = true;
    return next;
  });
  return touched ? { ...board, columns } : board;
}

/**
 * Kartadagi bitta buyurtmani joyida yamaydi (kuryer biriktirildi, bosqich
 * o'zgardi) — ustun o'zgarmaydi. Buyurtma doskada yo'q — o'sha doska.
 */
export function patchOrderInBoard(
  board: PipelineBoard,
  orderId: string,
  update: (order: PipelineOrder) => PipelineOrder,
): PipelineBoard {
  const found = findLeadByOrder(board, orderId);
  if (!found) return board;
  const { lead, columnKey } = found;
  const next: PipelineLead = {
    ...lead,
    orders: lead.orders.map((order) => (order.id === orderId ? update(order) : order)),
  };
  return mapColumn(board, columnKey, (column) => ({
    ...column,
    leads: column.leads.map((item) => (item.id === lead.id ? next : item)),
  }));
}
