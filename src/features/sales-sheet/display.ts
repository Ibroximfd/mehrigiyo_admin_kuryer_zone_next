import { boxesToDona } from "@/lib/dona";
import { groupThousands } from "@/lib/format";
import { PIECE_UNIT } from "@/lib/item-ref";

import { cellOf, isZeroCell } from "./types";
import type { CellMap, QtyCell, SheetProduct } from "./types";

/**
 * Donada yuritiladigan mahsulot katagi — jami dona (hujjat 84 §2.2): serverning
 * `pieces_total` i, bo'lmasa `qty × pieces_per_box + pieces` (aniq aylantirish).
 * Mahsulot donada yuritilmasa yoki karobkadagi dona noma'lum — `null`: katak
 * avvalgidek, taxmin qilinmaydi.
 */
export function cellDona(cell: QtyCell, product: SheetProduct | undefined): number | null {
  if (!product?.countsInDona) return null;
  if (cell.piecesTotal !== undefined) return cell.piecesTotal;
  return product.piecesPerBox === null ? null : boxesToDona(cell.qty, product.piecesPerBox, cell.pieces);
}

/** Ustunning hamma katagi donaga aylanadimi — shunda birlik sarlavhada «dona». */
function isDonaColumn(product: SheetProduct | undefined): boolean {
  return Boolean(product?.countsInDona && product.piecesPerBox !== null);
}

/** Ustun sarlavhasidagi birlik: dona ustuni — «dona» (sarlavhada yozilmaydi), qolgani — serverniki. */
export function columnUnit(product: SheetProduct): string {
  return isDonaColumn(product) ? PIECE_UNIT : product.unitLabel;
}

/**
 * Ko'rsatish yordamchilari — hisob emas: server bergan sonni matnga.
 * Donada yuritiladigan mahsulot — bitta son, donada («65»; «21 kar. 2 dona» emas).
 * Qolganida karobka + dona shakli sklad bilan bir xil (`describePieces`): «2 kar. 1 dona».
 * Faqat ustun birligidagi son — birliksiz («245»): birlik ustun sarlavhasida.
 */
export function cellText(cell: QtyCell, product?: SheetProduct): string {
  const dona = cellDona(cell, product);
  if (dona !== null) {
    // Karobkadagi dona noma'lum ustunda sarlavha «dona» emas — birlik katakning o'zida.
    return isDonaColumn(product) ? groupThousands(dona) : `${groupThousands(dona)} ${PIECE_UNIT}`;
  }
  if (cell.pieces === 0) return groupThousands(cell.qty);
  if (cell.qty === 0) return `${groupThousands(cell.pieces)} ${PIECE_UNIT}`;
  return `${groupThousands(cell.qty)} kar. ${groupThousands(cell.pieces)} ${PIECE_UNIT}`;
}

/** Ishorali harakat (`other`: tuzatish, qaytarish) — «+3», «−2 kar. 1 dona», donada — «−7». */
export function signedCellText(cell: QtyCell, product?: SheetProduct): string {
  const negative = cell.qty < 0 || cell.pieces < 0 || (cell.piecesTotal ?? 0) < 0;
  const size = { qty: Math.abs(cell.qty), pieces: Math.abs(cell.pieces) };
  const magnitude: QtyCell = cell.piecesTotal === undefined ? size : { ...size, piecesTotal: Math.abs(cell.piecesTotal) };
  return `${negative ? "−" : "+"}${cellText(magnitude, product)}`;
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
