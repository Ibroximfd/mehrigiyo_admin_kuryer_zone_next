import { resolveMediaUrl } from "@/lib/api-constants";
import { asInt, asOptionalString, asRecord, asString } from "@/lib/parse";

/** Qoldiq birligi sukut bo'yicha — server `unit_label` bermasa. */
export const PIECE_UNIT = "dona";

/**
 * Mahsulot havolasi — sklad (`items/`, `stock/`, `couriers/`) va moliya
 * (`chief/finance/` mahsulot qatorlari) javoblaridagi `item{}`. `image` —
 * to'liq URL (operator zakazidagi `medicine.image` bilan bir manba) yoki `null`.
 * `unitLabel` — qoldiq birligining nomi (hujjat 70 §2): «dona» yoki karobkada
 * yuritiladigan mahsulotda «karobka»; raqam yonida shu yoziladi.
 */
export type ItemRef = { id: number; name: string; image: string | null; unitLabel: string };

export function mapItemRef(raw: unknown): ItemRef {
  const json = asRecord(raw);
  const image = asOptionalString(json.image);
  return {
    id: asInt(json.id),
    name: asString(json.name ?? json.title),
    image: image ? resolveMediaUrl(image) : null,
    unitLabel: asOptionalString(json.unit_label) ?? PIECE_UNIT,
  };
}
