/**
 * Sovg'a qatorining manbasi (`gift_source`, aksiya shartnomasi §1) — qiymatlar
 * va yorliqlar bir joyda.
 *
 * Yorliq matni **faqat shu yerda**: qatorni chizadigan joylar (tarkib bo'limi,
 * tahrir formasi, yo'l varaqasi) shu funksiyadan o'qiydi, aks holda bir xil
 * sovg'a uch ekranda uch xil atalardi.
 *
 * Backend shartnomada manbani `manual` deb ataydi, UIda esa u "operator
 * qo'shgan" degani — ikkala kalit bitta qiymatga tushadi.
 *
 * **Noma'lum qiymat `null` bo'ladi, xato EMAS.** Backend yangi manba qo'shsa
 * qator oddiy "Sovg'a" yorlig'i bilan (`is_gift` bo'yicha) chiqadi va sayt
 * buzilmaydi.
 */

export const GIFT_SOURCES = ["promotion", "loyalty", "operator"] as const;

export type GiftSource = (typeof GIFT_SOURCES)[number];

const GIFT_SOURCE_LABELS: Record<GiftSource, string> = {
  promotion: "Aksiya sovg'asi",
  loyalty: "Mijoz sovg'asi",
  operator: "Operator qo'shgan",
};

/** Manba aytilmagan yoki tanilmagan sovg'a qatori. */
const PLAIN_GIFT_LABEL = "Sovg'a";

/** Shartnomadagi nom → UIdagi qiymat. */
const GIFT_SOURCE_ALIASES: Record<string, GiftSource> = { manual: "operator" };

const KNOWN: ReadonlySet<string> = new Set(GIFT_SOURCES);

export function asGiftSource(raw: unknown): GiftSource | null {
  const key = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!key) return null;
  if (KNOWN.has(key)) return key as GiftSource;
  return GIFT_SOURCE_ALIASES[key] ?? null;
}

/** Sovg'a qatorining yorlig'i; manba noma'lum bo'lsa — oddiy "Sovg'a". */
export function giftSourceLabel(source: GiftSource | null | undefined): string {
  return source ? GIFT_SOURCE_LABELS[source] : PLAIN_GIFT_LABEL;
}
