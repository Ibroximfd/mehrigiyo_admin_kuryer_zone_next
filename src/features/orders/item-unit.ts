import { PIECE_UNIT } from "@/lib/item-ref";

/**
 * Zakaz qatorining birligi (hujjat 77 §2): `box` — karobka, `piece` — dona.
 * Kalitlar qo'shuvchi: eski javobda `unit`, `unit_label`, `pieces` yo'q —
 * qiymat `null`, ekran avvalgidek faqat sonni ko'rsatadi.
 */
export type ItemUnit = "box" | "piece";

export function asItemUnit(raw: unknown): ItemUnit | null {
  const key = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return key === "box" || key === "piece" ? key : null;
}

export type ItemQuantity = {
  quantity: number;
  unit: ItemUnit | null;
  /** Logist shablonidagi nom («karobka», «flakon», «dona»). */
  unitLabel: string | null;
  /** Sklad birligida jami: karobka × ichidagi dona. */
  pieces: number | null;
};

/**
 * Qator soni birligi bilan: «1 karobka (3 dona)», sovg'ada «1 dona».
 *
 * «(N dona)» faqat karobkada va dona soni karobka sonidan farq qilsa —
 * «1 karobka (1 dona)» ortiqcha shovqin. Birlik nomi kelmagan (eski) javobda
 * faqat son: kartada «× 2», detalda «2 × narx» — avvalgidek.
 */
export function formatItemQuantity(item: ItemQuantity): string {
  if (!item.unitLabel) return String(item.quantity);
  const base = `${item.quantity} ${item.unitLabel}`;
  const showPieces = item.unit === "box" && item.pieces !== null && item.pieces !== item.quantity;
  return showPieces ? `${base} (${item.pieces} ${PIECE_UNIT})` : base;
}
