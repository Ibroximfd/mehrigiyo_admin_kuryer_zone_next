import { ApiError } from "@/lib/api-client";

/**
 * Karobka ↔ dona (hujjat 44). Qoldiq har doim DONADA; karobka — odamga qulaylik.
 * Serverga karobka va dona alohida ketadi, ko'paytirishni server
 * `package_size` bo'yicha o'zi qiladi. `package_size` yo'q yoki `1` —
 * mahsulotda karobka yo'q.
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

/** `19` dona, karobkada 9 → `2 kar. 1 dona`; karobkasiz → `19 dona`. */
export function describePieces(total: number, packageSize: number): string {
  if (!hasPackage(packageSize)) return `${total} dona`;
  const { boxes, pieces } = splitPieces(total, packageSize);
  if (boxes === 0) return `${pieces} dona`;
  if (pieces === 0) return `${boxes} kar.`;
  return `${boxes} kar. ${pieces} dona`;
}

/**
 * Server shakli: yo `quantity`, yo `boxes`/`units` — birga yuborilsa `400`.
 * Bu yerda faqat ikkinchisi; karobkasiz mahsulotda faqat `units`.
 */
export type PackedQuantity = { boxes?: number; units: number };

export function packedQuantity(boxes: number, pieces: number, packageSize: number): PackedQuantity {
  const units = Math.max(0, Math.trunc(pieces));
  return hasPackage(packageSize) ? { boxes: Math.max(0, Math.trunc(boxes)), units } : { units };
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
