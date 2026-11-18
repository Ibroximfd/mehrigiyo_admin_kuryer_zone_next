import type { ItemRef } from "@/lib/item-ref";

import type { CourierStock, SkladStockRow } from "./types";

/**
 * Kuryerlar ombori matritsasi (egasi so'rovi 2026-11-18 — Google Sheet kabi):
 * qator — kuryer, ustun — mahsulot, katak — kuryer qo'lidagi miqdor. Miqdorlar
 * server bergan holicha, mahsulotning o'z qoldiq birligida (`unit_label`) —
 * sklad qoldig'i (`stock/`) ham shu birlikda, shuning uchun «Omborim» qatori
 * kuryer kataklari bilan bir ustunda turadi.
 */

export type StockMatrixLine = {
  /** `products` tartibida; `0` — mahsulot yo'q (katak bo'sh chiziladi). */
  cells: number[];
  /** Qator yig'indisi. Birliklar aralash (dona va karobka, hujjat 70 §2) — birlik nomi yozilmaydi. */
  total: number;
  /** Miqdori noldan farqli mahsulotlar soni — «N xil mahsulot». */
  kinds: number;
};

/** Kuryer qatori; `stock` — amallar (berish / qabul / tuzatish) uchun asl yozuv. */
export type CourierStockLine = StockMatrixLine & { stock: CourierStock };

export type CourierStockMatrix = {
  /** Ustunlar: kimdadir (kuryer yoki sklad) noldan farqli miqdori bor mahsulotlar. */
  products: ItemRef[];
  /** «Omborim» — sklad qoldig'i; sklad qoldig'i berilmasa `null` (qator chizilmaydi). */
  store: StockMatrixLine | null;
  /** Kuryerlar — kelgan tartibda. */
  rows: CourierStockLine[];
  /** «Jami» — faqat kuryerlar bo'yicha (sklad qatori kirmaydi). */
  totals: { cells: number[]; total: number };
  /** Minus kuryer kataklari — ma'lumot xatosi, «Tuzatish» bilan to'g'rilanadi. */
  negativeCount: number;
};

type StockEntry = { item: ItemRef; quantity: number };

/** Javobda katalog tartibi yo'q — nom bo'yicha («Qoldiq» jadvali bilan bir xil), teng nomda `id`. */
function byName(a: ItemRef, b: ItemRef): number {
  return a.name.localeCompare(b.name) || a.id - b.id;
}

function lineOf(entries: readonly StockEntry[], columnOf: ReadonlyMap<number, number>): StockMatrixLine {
  const cells = Array.from({ length: columnOf.size }, () => 0);
  for (const entry of entries) {
    const column = columnOf.get(entry.item.id);
    if (column !== undefined) cells[column] += entry.quantity;
  }
  return {
    cells,
    total: cells.reduce((sum, quantity) => sum + quantity, 0),
    kinds: cells.filter((quantity) => quantity !== 0).length,
  };
}

export function buildCourierStockMatrix(
  stocks: readonly CourierStock[],
  storeStock?: readonly SkladStockRow[],
): CourierStockMatrix {
  const storeEntries = storeStock?.map((row): StockEntry => ({ item: row.item, quantity: row.inSklad }));
  const held = new Map<number, ItemRef>();
  for (const entry of [...(storeEntries ?? []), ...stocks.flatMap((stock) => stock.items)]) {
    if (entry.quantity !== 0 && !held.has(entry.item.id)) held.set(entry.item.id, entry.item);
  }
  const products = [...held.values()].sort(byName);
  const columnOf = new Map(products.map((product, index) => [product.id, index]));
  const rows = stocks.map((stock): CourierStockLine => ({ stock, ...lineOf(stock.items, columnOf) }));

  return {
    products,
    store: storeEntries ? lineOf(storeEntries, columnOf) : null,
    rows,
    totals: {
      cells: products.map((_, column) => rows.reduce((sum, row) => sum + row.cells[column], 0)),
      total: rows.reduce((sum, row) => sum + row.total, 0),
    },
    negativeCount: rows.reduce((count, row) => count + row.cells.filter((quantity) => quantity < 0).length, 0),
  };
}
