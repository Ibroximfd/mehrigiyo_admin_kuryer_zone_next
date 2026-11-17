import { ApiError } from "@/lib/api-client";
import { PIECE_UNIT } from "@/lib/item-ref";

/**
 * Karobka ↔ dona (hujjat 44, 70 §2). Donada yuritiladigan mahsulotda karobka —
 * odamga qulaylik: serverga karobka va dona alohida ketadi, ko'paytirishni
 * server `package_size` bo'yicha o'zi qiladi. `package_size` yo'q yoki `1` —
 * bo'linish yo'q: karobkasiz dona-mahsulot yoki skladda KAROBKADA yuritiladigan
 * mahsulot (server unda `package_size: 1` beradi, qoldiq o'zi karobkada).
 */

export function hasPackage(packageSize: number): boolean {
  return Math.trunc(packageSize) > 1;
}

function size(packageSize: number): number {
  return Math.max(1, Math.trunc(packageSize));
}

/** Ko'rsatish uchun yig'indi — server hisobi bilan bir xil formula. */
export function toPieces(boxes: number, pieces: number, packageSize: number): number {
  return Math.max(0, Math.trunc(boxes)) * size(packageSize) + Math.max(0, Math.trunc(pieces));
}

export function splitPieces(total: number, packageSize: number): { boxes: number; pieces: number } {
  const qty = Math.max(0, Math.trunc(total));
  return { boxes: Math.floor(qty / size(packageSize)), pieces: qty % size(packageSize) };
}

/** `19` dona, karobkada 9 → `2 kar. 1 dona`; bo'linishsiz → `19 dona` yoki `10 karobka` (birlik nomi). */
export function describePieces(total: number, packageSize: number, unitLabel: string = PIECE_UNIT): string {
  if (!hasPackage(packageSize)) return `${total} ${unitLabel}`;
  const { boxes, pieces } = splitPieces(total, packageSize);
  if (boxes === 0) return `${pieces} dona`;
  if (pieces === 0) return `${boxes} kar.`;
  return `${boxes} kar. ${pieces} dona`;
}

/**
 * Server shakli: yo `quantity`, yo `boxes`/`units` — birga yuborilsa `400`.
 * Bo'linishi bor mahsulotda `{boxes, units}`; qolganida `{quantity}` —
 * mahsulotning o'z birligida. Karobkada yuritiladigan mahsulotda `units`
 * yuborilsa server `400` qaytaradi (hujjat 70 §2), `quantity` esa N karobka.
 */
export type PackedQuantity = { boxes: number; units: number } | { quantity: number };

export function packedQuantity(boxes: number, pieces: number, packageSize: number): PackedQuantity {
  const units = Math.max(0, Math.trunc(pieces));
  return hasPackage(packageSize) ? { boxes: Math.max(0, Math.trunc(boxes)), units } : { quantity: units };
}

/**
 * `400 validation_error` qator xatolari: `fields.lines` — yuborilgan tartibdagi
 * ro'yxat, har element `{maydon: [matn]}` yoki bo'sh (hujjat 44 §6).
 */
export function rowErrorsOf(error: unknown, key: "lines" | "opening"): Array<string | null> {
  if (!(error instanceof ApiError) || !error.data || typeof error.data !== "object") return [];
  const fields = (error.data as Record<string, unknown>).fields;
  if (!fields || typeof fields !== "object") return [];
  const rows = (fields as Record<string, unknown>)[key];
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    if (!row || typeof row !== "object") return null;
    const messages = Object.values(row as Record<string, unknown>)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    return messages.length ? messages.join(" · ") : null;
  });
}
