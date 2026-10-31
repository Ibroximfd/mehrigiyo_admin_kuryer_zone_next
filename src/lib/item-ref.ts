import { resolveMediaUrl } from "@/lib/api-constants";
import { asInt, asOptionalString, asRecord, asString } from "@/lib/parse";

/**
 * Mahsulot havolasi — sklad (`items/`, `stock/`, `couriers/`) va moliya
 * (`chief/finance/` mahsulot qatorlari) javoblaridagi `item{}`. `image` —
 * to'liq URL (operator zakazidagi `medicine.image` bilan bir manba) yoki `null`.
 */
export type ItemRef = { id: number; name: string; image: string | null };

export function mapItemRef(raw: unknown): ItemRef {
  const json = asRecord(raw);
  const image = asOptionalString(json.image);
  return { id: asInt(json.id), name: asString(json.name ?? json.title), image: image ? resolveMediaUrl(image) : null };
}
