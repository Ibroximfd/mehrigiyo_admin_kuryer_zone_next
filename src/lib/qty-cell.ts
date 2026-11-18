import { boxesToDona, countsInDona, piecesPerBoxOf } from "@/lib/dona";
import { groupThousands } from "@/lib/format";
import { PIECE_UNIT } from "@/lib/item-ref";
import { asInt, asOptionalInt, asOptionalString, isRecord } from "@/lib/parse";

/**
 * Hisobot katagi — `{qty, pieces, pieces_total?}` (hujjat 83 §2.1, 84 §2.2):
 * `qty` — katalog birligida (karobka yoki dona), `pieces` — karobkadan tashqari
 * donalar, `piecesTotal` — donada yuritiladigan mahsulotda jami dona (faqat
 * server bersa). Bu yerda faqat o'qish va matnga aylantirish — hisob serverda.
 *
 * Qoida «Sotuv jadvali» (`features/sales-sheet/display.ts`) bilan bir xil;
 * u bo'lim ham shu modulga o'tkazilsa — bitta manba bo'ladi.
 */
export type QtyCell = { qty: number; pieces: number; piecesTotal?: number };

export const EMPTY_QTY: QtyCell = { qty: 0, pieces: 0 };

/** Ustun birligi — mahsulotdan (`count_unit`, `pieces_per_box`, `unit_label`). */
export type CellUnit = {
  /** Donada yuritiladi (hujjat 84 §1) — katakda bitta son, donada. */
  countsInDona: boolean;
  /** 1 karobkadagi dona; kelmasa `null` — taxmin qilinmaydi. */
  piecesPerBox: number | null;
  /** Sklad birligining nomi («dona» yoki «karobka»). */
  unitLabel: string;
};

export function mapCellUnit(json: Readonly<Record<string, unknown>>): CellUnit {
  return {
    countsInDona: countsInDona(json),
    piecesPerBox: piecesPerBoxOf(json.pieces_per_box),
    unitLabel: asOptionalString(json.unit_label) ?? PIECE_UNIT,
  };
}

/** Son holida kelgan miqdor ham qabul qilinadi — u sklad birligidagi son. */
export function mapQtyCell(raw: unknown): QtyCell {
  if (!isRecord(raw)) return { qty: asInt(raw), pieces: 0 };
  const piecesTotal = asOptionalInt(raw.pieces_total);
  const cell = { qty: asInt(raw.qty), pieces: asInt(raw.pieces) };
  return piecesTotal === null ? cell : { ...cell, piecesTotal };
}

export function isZeroQty(cell: QtyCell): boolean {
  return cell.qty === 0 && cell.pieces === 0 && !cell.piecesTotal;
}

/** Ustunning hamma katagi donaga aylanadimi — shunda birlik sarlavhada yozilmaydi. */
function isDonaColumn(unit: CellUnit): boolean {
  return unit.countsInDona && unit.piecesPerBox !== null;
}

/**
 * Donada yuritiladigan mahsulot katagi — jami dona: serverning `pieces_total` i,
 * bo'lmasa `qty × pieces_per_box + pieces` (`lib/dona` — yagona aniq aylantirish).
 * Donada yuritilmasa yoki karobkadagi dona noma'lum — `null`.
 */
export function qtyDona(cell: QtyCell, unit: CellUnit): number | null {
  if (!unit.countsInDona) return null;
  if (cell.piecesTotal !== undefined) return cell.piecesTotal;
  return unit.piecesPerBox === null ? null : boxesToDona(cell.qty, unit.piecesPerBox, cell.pieces);
}

/** Ustun sarlavhasidagi birlik: dona ustuni — «dona», qolgani — serverniki. */
export function columnUnit(unit: CellUnit): string {
  return isDonaColumn(unit) ? PIECE_UNIT : unit.unitLabel;
}

/** Katakning ustun birligidagi bitta soni (rang chegarasi uchun): donada — dona, aks holda `qty`. */
export function qtyCount(cell: QtyCell, unit: CellUnit): number {
  return qtyDona(cell, unit) ?? cell.qty;
}

/**
 * Katak matni — birliksiz son («245»), birlik ustun sarlavhasida. Donada
 * yuritiladigan mahsulot — bitta son («65», «21 kar. 2 dona» emas); karobka
 * mahsulotida ortiqcha dona bo'lsa — «2 kar. 1 dona».
 */
export function qtyText(cell: QtyCell, unit: CellUnit): string {
  const dona = qtyDona(cell, unit);
  if (dona !== null) return isDonaColumn(unit) ? groupThousands(dona) : `${groupThousands(dona)} ${PIECE_UNIT}`;
  if (cell.pieces === 0) return groupThousands(cell.qty);
  if (cell.qty === 0) return `${groupThousands(cell.pieces)} ${PIECE_UNIT}`;
  return `${groupThousands(cell.qty)} kar. ${groupThousands(cell.pieces)} ${PIECE_UNIT}`;
}

/** Ishorali harakat (tuzatish) — «+3», «−2». */
export function signedQtyText(cell: QtyCell, unit: CellUnit): string {
  const negative = cell.qty < 0 || cell.pieces < 0 || (cell.piecesTotal ?? 0) < 0;
  const size = { qty: Math.abs(cell.qty), pieces: Math.abs(cell.pieces) };
  const magnitude: QtyCell = cell.piecesTotal === undefined ? size : { ...size, piecesTotal: Math.abs(cell.piecesTotal) };
  return `${negative ? "−" : "+"}${qtyText(magnitude, unit)}`;
}
