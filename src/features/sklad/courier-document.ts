import { shownQuantity, stockQuantityOf } from "@/lib/item-ref";
import type { ItemRef } from "@/lib/item-ref";

import type { CourierStock, SkladStockRow } from "./types";

/**
 * Bosh kuryer hujjati qatorlari (sklad hujjati 2026-11-03 §6) — sof funksiyalar:
 * oynada qaysi mahsulotlar chiqadi, sukut qiymati va serverga nima ketadi.
 * Son ekrandagi birlikda (donada yuritiladigan mahsulot — donada, hujjat 84 §3).
 */

export type CourierDocumentMode = "courier_load" | "courier_return" | "adjustment";

export type DocumentRow = {
  item: ItemRef;
  /** Ekrandagi birlikda: berishda — skladdagi, qabul va tuzatishda — kuryerdagi qoldiq. */
  available: number;
  /** Kuryer qo'lida bor (noldan farqli, minus ham) — tuzatishda ro'yxat boshida. */
  held: boolean;
};

/** Ustunlar bilan bir xil: nom bo'yicha, teng nomda `id`. */
function byName(a: DocumentRow, b: DocumentRow): number {
  return a.item.name.localeCompare(b.item.name) || a.item.id - b.item.id;
}

/**
 * Oynadagi qatorlar:
 *   • berish — sklad qoldig'idagi hamma mahsulot, 0 va minus ham (hujjat 90: sklad minusga tushishi mumkin);
 *   • qabul — faqat kuryer qo'lidagi musbat mol;
 *   • tuzatish — hamma mahsulot (egasi, 2026-11-19): avval kuryer qo'lidagilar (minus ham —
 *     sanab tenglashtiriladi), keyin skladdagi qolgan mahsulotlar 0 bilan — sanaganda
 *     chiqqan, tizimda yo'q molni yozish uchun. Skladda yo'q, lekin kuryerda bor mahsulot ham qoladi.
 */
export function documentRows(mode: CourierDocumentMode, courier: CourierStock, stock: readonly SkladStockRow[]): DocumentRow[] {
  const heldIds = new Set(courier.items.filter((entry) => entry.quantity !== 0).map((entry) => entry.item.id));
  if (mode === "courier_load") {
    return stock.map((row) => ({ item: row.item, available: shownQuantity(row.item, row.inSklad), held: heldIds.has(row.item.id) }));
  }
  const held = courier.items
    .filter((entry) => (mode === "adjustment" ? entry.quantity !== 0 : entry.quantity > 0))
    .map((entry) => ({ item: entry.item, available: shownQuantity(entry.item, entry.quantity), held: true }));
  if (mode === "courier_return") return held;
  const rest = stock.filter((row) => !heldIds.has(row.item.id)).map((row) => ({ item: row.item, available: 0, held: false }));
  return [...held.sort(byName), ...rest.sort(byName)];
}

/** Sukut: berishda bo'sh (0); qabulda hammasi; tuzatishda joriy qoldiq — o'zgarmagan qator yuborilmaydi. */
export function initialDraft(mode: CourierDocumentMode, rows: readonly DocumentRow[]): Record<number, string> {
  return Object.fromEntries(rows.map((row) => [row.item.id, mode === "courier_load" ? "" : String(row.available)]));
}

/** Maydondagi matn → son; bo'sh, noto'g'ri yoki manfiy — 0. */
export function draftQuantity(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export type DocumentPlan = {
  /** Yuboriladigan qatorlar (ekrandagi birlikda): tuzatishda — o'zgargani, qolganida — musbati. */
  lines: Array<{ row: DocumentRow; qty: number }>;
  /** Server birligidagi qatorlar; butun karobka chiqmagan qator bu yerga tushmaydi. */
  sendable: Array<{ itemId: number; quantity: number }>;
  /** Karobkada turgan mahsulotda son butun karobka emas — saqlash yopiq. */
  notWhole: boolean;
  /** Bordan ko'p (berish va qabulda) — saqlanadi, faqat ogohlantirish (hujjat 90). */
  overLimit: boolean;
};

/**
 * Tuzatishda qator faqat logist/bosh kuryer maydonni o'zgartirgan bo'lsa ketadi.
 * Minus qoldiqli qatorning sukut matni «-3» — u `draftQuantity` da 0 o'qiladi;
 * matn solishtirilmasa, boshqa qatorni saqlaganda tegilmagan minus qatorlar ham
 * jimgina `actual_qty: 0` bo'lib ketardi.
 */
function adjustmentChanged(row: DocumentRow, raw: string | undefined, qty: number): boolean {
  return (raw ?? "") !== String(row.available) && qty !== row.available;
}

export function planDocument(mode: CourierDocumentMode, rows: readonly DocumentRow[], draft: Readonly<Record<number, string>>): DocumentPlan {
  const lines = rows
    .map((row) => ({ row, qty: draftQuantity(draft[row.item.id]) }))
    .filter(({ row, qty }) => (mode === "adjustment" ? adjustmentChanged(row, draft[row.item.id], qty) : qty > 0));
  const sendable = lines.flatMap(({ row, qty }) => {
    const quantity = stockQuantityOf(row.item, qty);
    return quantity === null ? [] : [{ itemId: row.item.id, quantity }];
  });
  return {
    lines,
    sendable,
    notWhole: sendable.length < lines.length,
    overLimit: mode !== "adjustment" && lines.some(({ row, qty }) => qty > row.available),
  };
}

/**
 * Tuzatishda kuryerga qo'shilayotgan mol (sanalgan > qoldiq) — Jami shuncha oshadi,
 * ekrandagi birlikda. Tuzatish molni skladdan olmaydi: 2026-11-23 da Vodiyda kuryerga
 * berilgan mol «Berish» o'rniga «Tuzatish» bilan yozilib, ikki marta sanalgan (hujjat
 * 113/114). Ro'yxat bo'sh bo'lmasa oyna ogohlantiradi va tasdiq so'raydi.
 */
export function adjustmentSurplus(lines: DocumentPlan["lines"]): Array<{ item: ItemRef; extra: number }> {
  return lines.filter(({ row, qty }) => qty > row.available).map(({ row, qty }) => ({ item: row.item, extra: qty - row.available }));
}
