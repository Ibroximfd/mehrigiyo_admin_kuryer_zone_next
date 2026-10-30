import type { DocumentInput } from "./api";

/**
 * Sklad harakati oynasining hisobi (kirim, chiqim, kuryerga berish,
 * kuryerdan qabul, tuzatish) — UI'siz, testlanadi.
 *
 * Chapda katalog (hamma nazoratdagi mahsulot + «qancha bor»), o'ngda
 * tanlanganlar. Son doim **dona**da (backend shuni oladi); karobka —
 * tez qo'shish tugmasi va izoh.
 */
export type MovementKind = DocumentInput["type"];

export type CatalogItem = {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  packageSize: number;
  pinned: boolean;
  /** Manbada qancha bor (ombor yoki kuryer); `null` — ma'lum emas. */
  available: number | null;
};

export type MovementLine = { item: CatalogItem; quantity: number };

/** Qaysi harakatda manbadagi qoldiqdan ortiq chiqarib bo'lmaydi. */
export function limitedByStock(kind: MovementKind): boolean {
  return kind === "write_off" || kind === "courier_load" || kind === "courier_return";
}

/**
 * Katalog tartibi: qadalganlar, keyin bori (chiqim/berish/qabulda —
 * bor mahsulot birinchi, yo'g'i oxirida), keyin nomi. Qidiruv nom, SKU
 * va shtrix-kod bo'yicha.
 */
export function sortCatalog(items: readonly CatalogItem[], kind: MovementKind): CatalogItem[] {
  const limited = limitedByStock(kind);
  return [...items].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      (limited ? Number((b.available ?? 0) > 0) - Number((a.available ?? 0) > 0) : 0) ||
      a.name.localeCompare(b.name),
  );
}

export function filterCatalog(items: readonly CatalogItem[], query: string): CatalogItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...items];
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(needle) ||
      item.sku.toLowerCase().includes(needle) ||
      (item.barcode !== "" && item.barcode === query.trim()),
  );
}

/** Skaner/Enter: aniq shtrix-kod yoki SKU, bo'lmasa yagona natija. */
export function scanMatch(items: readonly CatalogItem[], query: string): CatalogItem | null {
  const value = query.trim();
  if (!value) return null;
  const exact = items.find((item) => item.barcode === value || item.sku.toLowerCase() === value.toLowerCase());
  if (exact) return exact;
  const found = filterCatalog(items, value);
  return found.length === 1 ? found[0]! : null;
}

/** Yangi qator uchun boshlang'ich son: tuzatishda — hozirgi qoldiq, aks holda 1. */
export function initialQuantity(kind: MovementKind, item: CatalogItem): number {
  if (kind === "adjustment") return Math.max(0, item.available ?? 0);
  return 1;
}

/** Mahsulotni qo'shadi (bor bo'lsa `step` ga oshiradi). */
export function addItem(lines: readonly MovementLine[], kind: MovementKind, item: CatalogItem, step = 1): MovementLine[] {
  const existing = lines.find((line) => line.item.id === item.id);
  if (!existing) {
    const first = kind === "adjustment" ? initialQuantity(kind, item) : Math.max(1, step);
    return [{ item, quantity: first }, ...lines];
  }
  return lines.map((line) => (line.item.id === item.id ? { ...line, quantity: line.quantity + step } : line));
}

export function setQuantity(lines: readonly MovementLine[], itemId: number, quantity: number): MovementLine[] {
  const value = Math.max(0, Math.trunc(Number.isFinite(quantity) ? quantity : 0));
  return lines.map((line) => (line.item.id === itemId ? { ...line, quantity: value } : line));
}

export function removeItem(lines: readonly MovementLine[], itemId: number): MovementLine[] {
  return lines.filter((line) => line.item.id !== itemId);
}

/** «Hammasini» — manbadagi bor mahsulotlarning barchasi to'liq soni bilan. */
export function takeEverything(items: readonly CatalogItem[]): MovementLine[] {
  return items.filter((item) => (item.available ?? 0) > 0).map((item) => ({ item, quantity: item.available ?? 0 }));
}

/** Manbadagidan ko'p — saqlab bo'lmaydi (server ham rad etadi). */
export function overdraft(line: MovementLine, kind: MovementKind): boolean {
  return limitedByStock(kind) && line.item.available !== null && line.quantity > line.item.available;
}

export type MovementSummary = { items: number; pieces: number; boxesHint: number; overdrafts: number; empty: number };

export function summarize(lines: readonly MovementLine[], kind: MovementKind): MovementSummary {
  return lines.reduce<MovementSummary>(
    (sum, line) => ({
      items: sum.items + 1,
      pieces: sum.pieces + line.quantity,
      boxesHint: sum.boxesHint + Math.floor(line.quantity / Math.max(1, line.item.packageSize)),
      overdrafts: sum.overdrafts + Number(overdraft(line, kind)),
      empty: sum.empty + Number(kind !== "adjustment" && line.quantity === 0),
    }),
    { items: 0, pieces: 0, boxesHint: 0, overdrafts: 0, empty: 0 },
  );
}

/** Saqlash mumkinmi: qator bor, bo'sh son yo'q, ortiqcha yo'q. */
export function readyToSave(lines: readonly MovementLine[], kind: MovementKind): boolean {
  if (lines.length === 0) return false;
  const summary = summarize(lines, kind);
  return summary.overdrafts === 0 && summary.empty === 0;
}
