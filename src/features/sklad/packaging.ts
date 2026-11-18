import { ApiError } from "@/lib/api-client";
import { PIECE_UNIT, shownQuantity, shownUnit, stockQuantityOf } from "@/lib/item-ref";
import type { ItemRef } from "@/lib/item-ref";

/**
 * Karobka ↔ dona (hujjat 44, 70 §2). Skladda donada turgan mahsulotda karobka —
 * odamga qulaylik: serverga karobka va dona alohida ketadi, ko'paytirishni
 * server `package_size` bo'yicha o'zi qiladi. `package_size` yo'q yoki `1` —
 * bo'linish yo'q: karobkasiz dona-mahsulot yoki skladda KAROBKADA yuritiladigan
 * mahsulot (server unda `package_size: 1` beradi, qoldiq o'zi karobkada).
 * Donalab sotiladigan mahsulot (hujjat 84) esa bo'linmaydi — `entersBoxes`.
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

/** `19` dona, karobkada 9 → `2 kar. 1 dona` (dona nomi — serverning `unit_label` i, hujjat 72); bo'linishsiz → `19 dona` yoki `10 karobka`. */
export function describePieces(total: number, packageSize: number, unitLabel: string = PIECE_UNIT): string {
  if (!hasPackage(packageSize)) return `${total} ${unitLabel}`;
  const { boxes, pieces } = splitPieces(total, packageSize);
  if (boxes === 0) return `${pieces} ${unitLabel}`;
  if (pieces === 0) return `${boxes} kar.`;
  return `${boxes} kar. ${pieces} ${unitLabel}`;
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
 * Karobka + dona maydonlari bilan kiritiladimi: faqat donada yuritilmaydigan
 * karobkali mahsulot. Donada yuritiladigan mahsulot (hujjat 84 §1) — bitta dona
 * maydoni, «2 kar. 1 dona» bo'lib bo'linmaydi.
 */
export function entersBoxes(item: ItemRef, packageSize: number): boolean {
  return !item.countsInDona && hasPackage(packageSize);
}

/** Qator miqdori (server birligida) matni: karobkali — «2 kar. 1 dona»; donada yuritiladigan — «7 dona». */
export function describeLine(item: ItemRef, packageSize: number, quantity: number): string {
  return entersBoxes(item, packageSize)
    ? describePieces(quantity, packageSize, item.unitLabel)
    : describePieces(shownQuantity(item, quantity), 1, shownUnit(item));
}

/**
 * Kiritilgan qator → server shakli. Karobka + dona maydonli mahsulot — avvalgidek.
 * Donada yuritiladigan mahsulot — bitta dona maydonidan: skladda donada bo'lsa
 * avvalgi shakl (`{boxes: 0, units}` yoki `{quantity}`); skladda hali karobkada
 * (`stockFactor > 1`) — dona butun karobkaga aniq aylantirilib `{quantity}`,
 * butun chiqmasa `null` (yuborilmaydi, qatorda xato).
 */
export function enteredQuantity(item: ItemRef, packageSize: number, boxes: number, pieces: number): PackedQuantity | null {
  if (!item.countsInDona) return packedQuantity(boxes, pieces, packageSize);
  const quantity = stockQuantityOf(item, Math.max(0, Math.trunc(pieces)));
  if (quantity === null) return null;
  return item.stockFactor > 1 ? { quantity } : packedQuantity(0, quantity, packageSize);
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
