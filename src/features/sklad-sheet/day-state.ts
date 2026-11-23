import { boxesToDona } from "@/lib/dona";
import { PIECE_UNIT } from "@/lib/item-ref";
import { columnUnit, EMPTY_QTY, isZeroQty, qtyCount, qtyText } from "@/lib/qty-cell";
import type { CellUnit, QtyCell } from "@/lib/qty-cell";

import { buildCurrentStock, buildTotalOnly } from "./current-stock";
import type { CurrentStockModel, StockColumn, StockLabels, StockTableModel, StockValue } from "./current-stock";
import { cellOf } from "./types";
import type { SkladCellMap, SkladProduct, SkladSheet } from "./types";

/**
 * Kunning saqlangan holati (egasi, 2026-11-23): kuryerlar sotuv qilmasdan
 * oldingi holat — Jami · kuryerlarga berilgani · omborda qolgani. Kun
 * davomidagi sotuv va sovg'a bu jadvaldan AYRILMAYDI: ular ayrilgan qoldiq
 * ertangi kunning boshi bo'lib o'tadi. O'tgan kun tanlansa — o'sha kunning holati.
 *
 * Manba:
 *   1. server `day_state` (hujjat 117) — uchala qator ham serverdan;
 *   2. server hali bermasa — faqat «Jami»: `kun oxiri + sotuv + sovg'a`. Bu
 *      serverning o'z tenglamasidan aniq chiqadi (`closing = opening +
 *      from_company − sold − gift − to_company − write_off + other`), ya'ni
 *      «kun boshi + shu kungi kirim, qaytarish, chiqim va tuzatish». Kuryerlar /
 *      ombor bo'linishi esa javobda yo'q — u o'ylab topilmaydi.
 *
 * Sklad jadvalida frontend qo'shadigan yagona joy shu (2-band) — server
 * `day_state` ni chiqargach u ishlamay qoladi.
 */
export type DayStock = {
  total: SkladCellMap;
  /** `null` — server bo'linishni hali bermaydi. */
  split: { couriers: SkladCellMap; store: SkladCellMap } | null;
};

/**
 * Kataklar yig'indisi, mahsulot birligida: karobka va ortiqcha dona alohida
 * qo'shiladi, karobkadagi dona ma'lum bo'lsa — ortiqcha donalar karobkaga
 * yig'iladi. `piecesTotal` faqat hamma (noldan farqli) katakda bo'lsa beriladi.
 */
export function sumQty(cells: readonly QtyCell[], unit: CellUnit): QtyCell {
  let qty = 0;
  let pieces = 0;
  let dona = 0;
  let donaKnown = cells.some((cell) => cell.piecesTotal !== undefined);
  for (const cell of cells) {
    qty += cell.qty;
    pieces += cell.pieces;
    if (cell.piecesTotal !== undefined) dona += cell.piecesTotal;
    else if (!isZeroQty(cell)) donaKnown = false;
  }
  if (unit.piecesPerBox !== null) {
    const loose = boxesToDona(qty, unit.piecesPerBox, pieces);
    qty = Math.trunc(loose / unit.piecesPerBox);
    pieces = loose - qty * unit.piecesPerBox;
  }
  return donaKnown ? { qty, pieces, piecesTotal: dona } : { qty, pieces };
}

/** Sotuvgacha Jami: `kun oxiri + sotuv + sovg'a`; uch blokdan biri yo'q — `null` (son yasalmaydi). */
function totalBeforeSales(sheet: SkladSheet): SkladCellMap | null {
  const { closing, sold, gift } = sheet;
  if (!closing || !sold || !gift) return null;
  const total: Record<string, QtyCell> = {};
  for (const product of sheet.products) {
    const cell = sumQty(
      [closing, sold, gift].map((flow) => cellOf(flow.items, product.id) ?? EMPTY_QTY),
      product,
    );
    if (!isZeroQty(cell)) total[String(product.id)] = cell;
  }
  return total;
}

/** `null` — «Jami» ni ham bilib bo'lmaydi (javobda kun oxiri, sotuv yoki sovg'a bloki yo'q). */
export function dayStockOf(sheet: SkladSheet): DayStock | null {
  if (sheet.dayState) {
    return { total: sheet.dayState.total, split: { couriers: sheet.dayState.couriers, store: sheet.dayState.store } };
  }
  const total = totalBeforeSales(sheet);
  return total ? { total, split: null } : null;
}

export const DAY_STATE_LABELS: StockLabels = { total: "Jami", couriers: "Kuryerlarga berilgan", store: "Omborda qolgan" };

export type DayStockModel =
  /** Server `day_state` — uch qator va asosiy raqamlar. */
  | { kind: "split"; table: CurrentStockModel }
  /** Faqat «Jami» qatori; `total` — qator yig'indisi. */
  | { kind: "total"; table: StockTableModel; total: number };

/** `min` — kam qoldiq chegaralari (`current.min`; sanaga bog'liq emas), yo'q bo'lsa rang berilmaydi. */
export function buildDayStock(products: readonly SkladProduct[], stock: DayStock, min: Readonly<Record<string, number>> = {}): DayStockModel {
  const valueOf = (cells: SkladCellMap, product: SkladProduct): StockValue => {
    const cell = cellOf(cells, product.id) ?? EMPTY_QTY;
    return { count: qtyCount(cell, product), text: qtyText(cell, product) };
  };
  const columnOf = (product: SkladProduct): StockColumn => {
    const unit = columnUnit(product);
    return { id: product.id, name: product.name, unit: unit === PIECE_UNIT ? "" : unit };
  };
  const base = products.map((product) => ({
    product,
    column: columnOf(product),
    total: valueOf(stock.total, product),
    min: min[String(product.id)] ?? null,
  }));
  const { split } = stock;
  if (split === null) {
    const table = buildTotalOnly(base, DAY_STATE_LABELS.total);
    return { kind: "total", table, total: table.rows[0]?.total ?? 0 };
  }
  return {
    kind: "split",
    table: buildCurrentStock(
      base.map(({ product, ...line }) => ({ ...line, store: valueOf(split.store, product), couriers: valueOf(split.couriers, product) })),
      DAY_STATE_LABELS,
    ),
  };
}
