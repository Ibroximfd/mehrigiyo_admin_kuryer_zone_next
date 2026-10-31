import { asNumber, asString, isRecord } from "@/lib/parse";

/**
 * Buyurtma qatorining narx tafsiloti — chegirma/aksiya belgisi va chizilgan
 * asl narx. Qoidalar shu yerda, uchala ko'rinish (tarkib, tahrir, yuk xati)
 * shu yerdan o'qiydi: bir xil qator uch ekranda uch xil ko'rinmasin.
 *
 * ⚠️ **Hisob YO'Q.** Foiz, asl narx va sotilgan dona narxi faqat serverdan
 * (`discount_percent`, `original_price`, `unit_price`, `offer`). O'lchangan
 * javobda (test host, 2026-10-09) `price` — ASL dona narxi, `total` —
 * chegirmali qator jami. Ikkisidan foiz yoki dona narxini chiqarish oson
 * ko'rinadi, lekin bu aynan taqiqlangan hisob: aksiya (1+1, bonus) qatorida
 * natija yolg'on chiqadi, eski (narxi muhrlangan) buyurtmada esa chegirma
 * bo'lmagan joyda "chegirma" paydo bo'ladi.
 *
 * Yangi maydonlar kelmasa hammasi jim: belgi ham, chizilgan narx ham
 * chiqmaydi — qator avvalgidek ko'rinadi.
 */

export const ITEM_OFFER_KINDS = ["discount", "promo_price", "promo_price_bonus"] as const;

/** Server yangi tur qo'shsa — `other`: sayt buzilmaydi, yorlig'i ko'rsatiladi. */
export const ITEM_OFFER_KIND_VALUES = [...ITEM_OFFER_KINDS, "other"] as const;

export type ItemOfferKind = (typeof ITEM_OFFER_KIND_VALUES)[number];

/** Buyurtma paytida muhrlangan taklif (`offer`). */
export type ItemOffer = {
  kind: ItemOfferKind;
  /** Admin matni (`"-50%"`, `"1+1"`); bo'sh bo'lishi mumkin. */
  label: string;
  /** Server foizi; yo'q — `0`. */
  percent: number;
};

const KNOWN_KINDS: ReadonlySet<string> = new Set(ITEM_OFFER_KINDS);

/** Server foizi `(0, 100]` oralig'ida bo'lsa o'zi, aks holda `0` (`"50.00"` ham o'qiladi). */
export function asPercent(raw: unknown): number {
  const value = asNumber(raw, 0);
  return value > 0 && value <= 100 ? value : 0;
}

/**
 * `offer` obyekti. Noma'lum `kind` — `other`; tanilmagan tur na yorliq,
 * na foiz bilan kelsa ko'rsatadigan narsa yo'q — `null`.
 */
export function asItemOffer(raw: unknown): ItemOffer | null {
  if (!isRecord(raw)) return null;
  const key = asString(raw.kind).trim().toLowerCase();
  const kind: ItemOfferKind = KNOWN_KINDS.has(key) ? (key as ItemOfferKind) : "other";
  const label = asString(raw.label).trim();
  const percent = asPercent(raw.percent);
  if (kind === "other" && !label && percent === 0) return null;
  return { kind, label, percent };
}

