import { donaToBoxes } from "@/lib/dona";
import { PIECE_UNIT } from "@/lib/item-ref";
import type { ItemRef } from "@/lib/item-ref";

import { cellDona } from "./display";
import { cellOf, isZeroCell } from "./types";
import type { IssueLine, PlanCourier, QtyCell, SheetProduct } from "./types";

/**
 * Sotuv jadvalidagi «Berish kerak» qatori — tahrirlanadigan sonlar (egasi,
 * 2026-11-20: «uzun qatorda nimadan qancha berish kerakligi chiqsin; hammasini
 * shu joyda berish bosadi yoki birining sonini o'zgartirib bosadi»). Sof
 * funksiyalar: katak → bitta son, jadval birligi → sklad hujjati birligi,
 * yuboriladigan qatorlar. Hisob (kerak − qo'lida) serverda (`to_issue`).
 */

/**
 * Katakdagi bitta butun son: donada yuritiladigan mahsulot — dona, qolgani —
 * katalog birligi (`qty`). Karobka + ortiqcha dona aralash katak bitta songa
 * sig'maydi — `null` (maydon bo'sh qoladi, server qatori ishlatiladi).
 */
export function cellCount(cell: QtyCell, product: SheetProduct): number | null {
  const dona = cellDona(cell, product);
  if (dona !== null) return dona;
  return cell.pieces === 0 ? cell.qty : null;
}

/** Jadvaldagi son donadami: donada yuritiladigan yoki katalog birligi «dona». */
function sheetInPieces(product: SheetProduct): boolean {
  return product.countsInDona || product.unitLabel === PIECE_UNIT;
}

/**
 * Jadval soni → sklad hujjati birligi (`stock_unit`). Bir xil birlik — o'zi;
 * dona → karobka — faqat butun karobka; karobka → dona — `× pieces_per_box`.
 * Sklad birligi noma'lum (eski javob) — jadval birligi bilan bir xil deb
 * olinadi (avvalgi «Berish» oynasidagidek). Aylantirib bo'lmasa — `null`.
 */
export function toStockQuantity(product: SheetProduct, item: ItemRef | undefined, count: number): number | null {
  if (!item) return null;
  const inPieces = sheetInPieces(product);
  const stockInPieces = item.stockUnit === undefined ? inPieces : item.stockUnit === "piece";
  if (inPieces === stockInPieces) return count;
  // Karobkadagi dona — sklad mahsulotidan (qadoq skladniki); jadval mahsulotida
  // ba'zan boshqacha keladi (hujjat 101 §3.7), u faqat zaxira.
  const perBox = item.piecesPerBox ?? product.piecesPerBox ?? null;
  if (perBox === null) return null;
  return inPieces ? donaToBoxes(count, perBox) : count * perBox;
}

/** Maydonlarning sukuti — serverning `to_issue` i (jadval birligida); kerak bo'lmagani yo'q (bo'sh maydon). */
export function issueDefaults(issue: PlanCourier | null, products: readonly SheetProduct[]): Record<number, number> {
  const out: Record<number, number> = {};
  if (!issue) return out;
  for (const product of products) {
    const cell = cellOf(issue.toIssue, product.id);
    if (isZeroCell(cell)) continue;
    const count = cellCount(cell, product);
    if (count !== null && count > 0) out[product.id] = count;
  }
  return out;
}

/** Maydondagi matn → son; bo'sh yoki noto'g'ri — 0. */
export function draftCount(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export type IssuePlanLines = {
  /** `courier_load` qatorlari — sklad birligida. */
  lines: IssueLine[];
  /** Son kiritilgan, lekin sklad birligiga aylanmagan mahsulotlar (butun karobka emas yoki birlik noma'lum). */
  invalid: number[];
};

/**
 * Yuboriladigan qatorlar. O'zgartirilmagan son — serverning `issue_lines`
 * qatori aynan (birlik aylantirishsiz); o'zgartirilgani — `toStockQuantity`.
 */
export function planIssueLines(
  products: readonly SheetProduct[],
  counts: Readonly<Record<number, number>>,
  defaults: Readonly<Record<number, number>>,
  serverLines: readonly IssueLine[],
  itemOf: (id: number) => ItemRef | undefined,
): IssuePlanLines {
  const lines: IssueLine[] = [];
  const invalid: number[] = [];
  for (const product of products) {
    const count = counts[product.id] ?? 0;
    if (count <= 0) continue;
    const server = serverLines.find((line) => line.itemId === product.id);
    if (server && defaults[product.id] === count) {
      lines.push(server);
      continue;
    }
    const quantity = toStockQuantity(product, itemOf(product.id), count);
    if (quantity === null || quantity <= 0) invalid.push(product.id);
    else lines.push({ itemId: product.id, quantity });
  }
  return { lines, invalid };
}
