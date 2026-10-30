/**
 * Mahsulot narxi — **serverning `price` bloki yagona haqiqat manbai**.
 *
 * Narx logist ekranida ko'rinadigan va yangi qatorga yoziladigan raqam,
 * shuning uchun u hech qachon mijozda hisoblanmaydi (`item-pricing.ts`
 * dagi "Hisob YO'Q" qoidasi katalogga ham tegishli). Aksiya buni isbotladi:
 * aksiya mahsulotida `cost` **asl narx bo'lib qoladi** (`600000`) va
 * `discount` **nol** bo'ladi — chegirma aksiyadan alohida narsa — aksiya
 * narxi esa faqat `price.amount` da (`499000`). Ya'ni
 * `cost × (100 − discount)/100` aksiyada logistga **boshqa narx** ko'rsatadi.
 *
 * Javob shakli (`GET /shop/medicines/`, o'lchangan 2026-10-09):
 *
 * ```jsonc
 * "price": {
 *   "amount": 125000,             // num yoki "125000.00" — cast qilinmaydi
 *   "currency": "UZS",
 *   "display": "125 000 so'm",    // tayyor satr, ekranga SHU chiziladi
 *   "market": "UZ",
 *   "original_display": "250 000 so'm", // chegirma/aksiya — ustidan chiziq
 *   "discount_percent": 50
 * }
 * ```
 *
 * Uch holat **aralashtirilmaydi** (CRM `features/products/price.ts` va
 * ilovadagi `lib/core/pricing/price.dart` bilan bir xil shartnoma):
 *
 * 1. `price` kaliti **umuman yo'q** → eski backend. Qiymat `cost`/`discount`
 *    dan yasaladi ([legacyFinalPrice]) va `isLegacyFallback` rost bo'ladi —
 *    narxni o'zimiz formatlaydigan YAGONA yo'l.
 * 2. kalit bor, qiymati **`null`** → mahsulotning shu bozorda narxi yo'q:
 *    ko'rsatiladi, lekin sotilmaydi ([isSellable] yolg'on).
 * 3. kalit bor, obyekt → **o'sha ustun**, hech narsa hisoblanmaydi.
 */

import { formatSom } from "@/lib/format";
import {
  asInt,
  asOptionalNumber,
  asOptionalString,
  asString,
  isRecord,
  type Json,
} from "@/lib/parse";

export type ProductPrice = {
  /** Xom summa — yangi qatorning dona narxi shundan. */
  amount: number;
  /** ISO kod: `UZS` | `SAR` | `USD`. */
  currency: string;
  /** Serverning tayyor satri. Bo'sh — faqat `isLegacyFallback` da. */
  display: string;
  /** Bozor: `UZ` | `SA` | `INTL`. */
  market: string;
  /** Chegirmadan oldingi narx, tayyor satr. Chegirma yo'q — `null`. */
  originalDisplay: string | null;
  /** Chegirma foizi; yo'q bo'lsa `0`. Mijozda hisoblanmaydi. */
  discountPercent: number;
  /** Rost — server `price` yubormagan, qiymat `cost` dan yasalgan. */
  isLegacyFallback: boolean;
};

/**
 * Eski (`price` siz) backend uchun zaxira hisob — **boshqa joyda
 * ishlatilmaydi**. Aksiya narxini bilmaydi: `cost` va `discount` aksiyada
 * o'zgarmaydi, shuning uchun bu faqat `price` kaliti umuman kelmaganda
 * to'g'ri javob beradi.
 */
export function legacyFinalPrice(product: {
  cost: number;
  discount: number;
}): number {
  return product.discount > 0
    ? Math.trunc((product.cost * (100 - product.discount)) / 100)
    : product.cost;
}

function legacyPrice(amount: number, discount: number): ProductPrice {
  return {
    amount,
    currency: "UZS",
    display: "",
    market: "UZ",
    originalDisplay: null,
    discountPercent: discount,
    isLegacyFallback: true,
  };
}

/**
 * Mahsulot javobidan narxni o'qiydi. `null` — shu bozorda narxi yo'q
 * (2-holat), bu "eski backend" (1-holat) dan farq qiladi.
 */
export function readProductPrice(json: Json): ProductPrice | null {
  // 1-holat: kalit umuman yo'q. `null` dan ataylab `in` bilan ajratiladi.
  if (!("price" in json)) {
    const cost = asInt(json.cost);
    const discount = asInt(json.discount);
    return legacyPrice(legacyFinalPrice({ cost, discount }), discount);
  }

  const raw = json.price;
  // 2-holat.
  if (raw === null || raw === undefined) return null;

  // Server narxni yalang'och son qilib yuborsa — formatlash bizda qoladi.
  if (!isRecord(raw)) {
    const amount = asOptionalNumber(raw);
    return amount === null ? null : legacyPrice(amount, 0);
  }

  // 3-holat. `display` ikki nomda keladi (`formatted` — shartnoma hujjati).
  const amount = asOptionalNumber(raw.amount);
  const display =
    asOptionalString(raw.display) ?? asOptionalString(raw.formatted);
  if (amount === null && display === null) return null;

  return {
    amount: amount ?? 0,
    currency: asString(raw.currency, "UZS"),
    display: display ?? "",
    market: asString(raw.market, "UZ"),
    originalDisplay: asOptionalString(raw.original_display),
    discountPercent: asInt(raw.discount_percent),
    isLegacyFallback: false,
  };
}

/**
 * Sotuv summasi — yangi qatorning dona narxi (`catalogPrice`) shu.
 * `null` — narx yo'q, ya'ni mahsulot sotilmaydi (`0` ni ham shunday
 * o'qiymiz: nolga sotish logistning tanlovi bo'lmasligi kerak).
 */
export function productAmount(product: {
  price: ProductPrice | null;
}): number | null {
  const amount = product.price?.amount ?? 0;
  return amount > 0 ? amount : null;
}

/**
 * Ekranga chiziladigan satr. Serverning `display` i bor bo'lsa — o'sha;
 * eski backendda (va yalang'och sonda) bitta joyda formatlanadi.
 * `null` — narxi yo'q.
 */
export function productPriceText(product: {
  price: ProductPrice | null;
}): string | null {
  const price = product.price;
  if (price === null) return null;
  if (price.display) return price.display;
  return price.amount > 0 ? formatSom(price.amount) : null;
}

/** Buyurtmaga qo'shish mumkinmi: faol va narxi bor. */
export function isSellable(product: {
  isActive: boolean;
  price: ProductPrice | null;
}): boolean {
  return product.isActive && productAmount(product) !== null;
}
