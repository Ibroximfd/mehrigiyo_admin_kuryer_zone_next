import { groupThousands } from "@/lib/format";
import { PIECE_UNIT } from "@/lib/item-ref";

import { cellOf, isZeroCell } from "./types";
import type { CellMap, QtyCell, SheetProduct } from "./types";

/**
 * Ko'rsatish yordamchilari — hisob emas: server bergan sonni matnga.
 * Karobka + dona shakli sklad bilan bir xil (`describePieces`): «2 kar. 1 dona».
 * Faqat sklad birligidagi son — birliksiz («245»): birlik ustun sarlavhasida.
 */
export function cellText(cell: QtyCell): string {
  if (cell.pieces === 0) return groupThousands(cell.qty);
  if (cell.qty === 0) return `${groupThousands(cell.pieces)} ${PIECE_UNIT}`;
  return `${groupThousands(cell.qty)} kar. ${groupThousands(cell.pieces)} ${PIECE_UNIT}`;
}

/** Ishorali harakat (`other`: tuzatish, qaytarish) — «+3», «−2 kar. 1 dona». */
export function signedCellText(cell: QtyCell): string {
  const negative = cell.qty < 0 || cell.pieces < 0;
  return `${negative ? "−" : "+"}${cellText({ qty: Math.abs(cell.qty), pieces: Math.abs(cell.pieces) })}`;
}

/** Pul — «31 080 000»; yo'q (`null`) — «—». */
export function moneyText(value: number | null): string {
  return value === null ? "—" : groupThousands(value);
}

/** Noldan farqli kataklar ustun tartibida — ogohlantirish va «N xil mahsulot» uchun. */
export function filledCells(cells: CellMap, products: readonly SheetProduct[]): Array<{ product: SheetProduct; cell: QtyCell }> {
  return products
    .map((product) => ({ product, cell: cellOf(cells, product.id) }))
    .filter((entry) => !isZeroCell(entry.cell));
}

/** `2026-11-16` → `16.11.2026`. */
export function fullDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

/** `2026-11-16` → `16.11`. */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${day}.${month}`;
}
