/**
 * «Faqat dona» (egasi qarori 2026-11-18, hujjat 84 §1): donalab sotiladigan
 * mahsulot — karobkasiz dona mahsuloti yoki donalab sotish yoqilgan karobkali
 * mahsulot — hamma joyda faqat donada: 31 kiritilsa 31 dona, «10 kar. 1 dona»
 * emas. Faqat karobkada sotiladigan mahsulot o'zgarmaydi.
 *
 * Bu yerda — yagona aniq aylantirish. Karobkadagi dona soni faqat serverdan
 * (`pieces_per_box`); kelmasa hech narsa taxmin qilinmaydi — son serverdagidek
 * ko'rsatiladi.
 */

export type CountUnit = "piece" | "box";

export function asCountUnit(value: unknown): CountUnit | null {
  const key = typeof value === "string" ? value.trim().toLowerCase() : "";
  return key === "piece" || key === "box" ? key : null;
}

/**
 * Mahsulot donada yuritiladimi: server `count_unit` bersa — u (hujjat 84 §2.1);
 * bermasa — donalab sotish belgisi: `piece_sale: true` yoki `units_allowed`
 * da `piece` (hujjat 77 §4).
 */
export function countsInDona(json: Readonly<Record<string, unknown>>): boolean {
  const countUnit = asCountUnit(json.count_unit);
  if (countUnit) return countUnit === "piece";
  if (json.piece_sale === true) return true;
  return Array.isArray(json.units_allowed) && json.units_allowed.some((unit) => asCountUnit(unit) === "piece");
}

/** Karobkadagi dona — faqat musbat butun son; aks holda `null` (taxmin qilinmaydi). */
export function piecesPerBoxOf(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Karobka → dona, aniq: `karobka × karobkadagi dona + ortiqcha dona`. Ishora saqlanadi (minus qoldiq, qaytarish). */
export function boxesToDona(boxes: number, piecesPerBox: number, pieces = 0): number {
  return boxes * piecesPerBox + pieces;
}

/** Dona → karobka: faqat butun karobka bo'lsa; aks holda `null` — serverga kasr karobka yuborilmaydi. */
export function donaToBoxes(dona: number, piecesPerBox: number): number | null {
  return Number.isInteger(dona) && dona % piecesPerBox === 0 ? dona / piecesPerBox : null;
}
