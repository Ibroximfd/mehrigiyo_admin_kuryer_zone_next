/**
 * Karobka ↔ dona. Backend faqat **dona** qabul qiladi (§2); oynalarda
 * logist karobka + dona kiritadi, UI donaga keltiradi.
 */
export function toPieces(boxes: number, pieces: number, packageSize: number): number {
  const size = Math.max(1, Math.trunc(packageSize));
  return Math.max(0, Math.trunc(boxes)) * size + Math.max(0, Math.trunc(pieces));
}

/** `66` dona, karobkada 12 → `5 karobka + 6 dona`. */
export function splitPieces(total: number, packageSize: number): { boxes: number; pieces: number } {
  const size = Math.max(1, Math.trunc(packageSize));
  const qty = Math.max(0, Math.trunc(total));
  return { boxes: Math.floor(qty / size), pieces: qty % size };
}

/** Jadval uchun qisqa yozuv: `5 kar. 6 dona` yoki `6 dona`. */
export function describePieces(total: number, packageSize: number): string {
  const { boxes, pieces } = splitPieces(total, packageSize);
  if (boxes === 0) return `${pieces} dona`;
  if (pieces === 0) return `${boxes} kar.`;
  return `${boxes} kar. ${pieces} dona`;
}
