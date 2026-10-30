import { resolveMediaUrl } from "@/lib/api-constants";
import { asInt, asRecord, asString } from "@/lib/parse";

import { readProductPrice, type ProductPrice } from "./price";

/**
 * Do'kon mahsuloti (`/shop/medicines/`).
 *
 * Bitta model uchta joyda ishlatiladi: chatdagi tavsiya kartochkasi,
 * xabar ichidagi tavsiya va admin savati — shuning uchun chat emas,
 * alohida bo'limda turadi.
 */
export type Product = {
  id: number;
  title: string;
  /** Chegirmasiz narx (eski kalit). Aksiyada **o'zgarmaydi** — `price` ustun. */
  cost: number;
  /** Katalog chegirmasi foizi. Aksiyada `0` bo'ladi — u alohida narsa. */
  discount: number;
  /**
   * Serverning tayyor narxi: yangi qatorning dona narxi ham, ekranga
   * chiziladigan satr ham shundan (`price.ts`). `null` — mahsulotning shu
   * bozorda narxi yo'q.
   */
  price: ProductPrice | null;
  isActive: boolean;
  /** Bo'sh satr — rasm yo'q. */
  image: string;
};

export type ProductsPage = {
  products: Product[];
  hasMore: boolean;
};

export function mapProduct(raw: unknown): Product {
  const json = asRecord(raw);
  const image = asString(json.image);

  return {
    id: asInt(json.id),
    title: asString(json.title),
    cost: asInt(json.cost),
    discount: asInt(json.discount),
    price: readProductPrice(json),
    // Maydon kelmasa mahsulot faol deb hisoblanadi.
    isActive: json.is_active !== false,
    image: image ? resolveMediaUrl(image) : "",
  };
}
