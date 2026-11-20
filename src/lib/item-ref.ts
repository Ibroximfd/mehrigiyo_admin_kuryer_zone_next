import { resolveMediaUrl } from "@/lib/api-constants";
import { asCountUnit, boxesToDona, countsInDona, donaToBoxes, piecesPerBoxOf } from "@/lib/dona";
import type { CountUnit } from "@/lib/dona";
import { asInt, asOptionalString, asRecord, asString } from "@/lib/parse";

/** Qoldiq birligi sukut bo'yicha — server `unit_label` bermasa. */
export const PIECE_UNIT = "dona";

/**
 * Mahsulot havolasi — sklad (`items/`, `stock/`, `couriers/`) va moliya
 * (`chief/finance/` mahsulot qatorlari) javoblaridagi `item{}`. `image` —
 * to'liq URL (operator zakazidagi `medicine.image` bilan bir manba) yoki `null`.
 * `unitLabel` — server sonining birligi (hujjat 70 §2): «dona» yoki karobkada
 * yuritiladigan mahsulotda «karobka».
 */
export type ItemRef = {
  id: number;
  name: string;
  image: string | null;
  unitLabel: string;
  /** Donada yuritiladi (hujjat 84 §1): karobka + dona bo'lib ko'rsatilmaydi, kiritish — donada. */
  countsInDona: boolean;
  /**
   * 1 sklad birligida ekrandagi nechta. Donada yuritiladigan, lekin skladda hali
   * karobkada turgan mahsulotda (`stock_unit: box`, hujjat 84 §3) — `pieces_per_box`;
   * qolganida (va karobkadagi dona kelmasa) 1 — son serverdagidek.
   */
  stockFactor: number;
  /**
   * Sklad soni qaysi birlikda (`stock_unit`): `piece` — donada, `box` — karobkada;
   * kelmasa — kalit yo'q. Sotuv jadvalidagi son (katalog birligi) ni hujjat birligiga
   * aylantirish uchun (`sales-sheet/issue-draft.ts`).
   */
  stockUnit?: CountUnit;
  /** 1 karobkadagi dona (`pieces_per_box`); kelmasa — kalit yo'q. */
  piecesPerBox?: number;
};

export function mapItemRef(raw: unknown): ItemRef {
  const json = asRecord(raw);
  const image = asOptionalString(json.image);
  const inDona = countsInDona(json);
  const piecesPerBox = piecesPerBoxOf(json.pieces_per_box);
  const boxedStock = asCountUnit(json.stock_unit) === "box";
  return {
    id: asInt(json.id),
    name: asString(json.name ?? json.title),
    image: image ? resolveMediaUrl(image) : null,
    unitLabel: asOptionalString(json.unit_label) ?? PIECE_UNIT,
    countsInDona: inDona,
    stockFactor: inDona && boxedStock && piecesPerBox !== null ? piecesPerBox : 1,
    // Faqat server bersa — eski javobda kalit umuman yo'q (taxmin qilinmaydi).
    stockUnit: asCountUnit(json.stock_unit) ?? undefined,
    piecesPerBox: piecesPerBox ?? undefined,
  };
}

/** Ekrandagi son: skladda karobkada turgan dona mahsuloti — donaga (aniq), qolgani o'z holicha. */
export function shownQuantity(item: ItemRef, quantity: number): number {
  return boxesToDona(quantity, item.stockFactor);
}

/** Ekrandagi son birligi: donaga aylantirilgan son — «dona», qolgani — serverniki. */
export function shownUnit(item: ItemRef): string {
  return item.stockFactor > 1 ? PIECE_UNIT : item.unitLabel;
}

/** Kiritilgan (ekrandagi) son → server birligi; butun karobka chiqmasa `null` (yuborilmaydi). */
export function stockQuantityOf(item: ItemRef, shown: number): number | null {
  return donaToBoxes(shown, item.stockFactor);
}
