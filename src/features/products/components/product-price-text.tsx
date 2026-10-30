import { cn } from "@/lib/utils";

import { productPriceText } from "../price";
import type { Product } from "../types";

/**
 * Mahsulot narxi — serverning tayyor satri, ustidan chiziqli "eski narx"
 * bilan birga.
 *
 * Katalog narxini hamma joyda shu widget chizadi: aksiya narxi faqat `price`
 * blokida keladi, ya'ni `cost`/`discount` dan hisoblagan har bir joy logistga
 * **boshqa raqam** ko'rsatardi (`price.ts` izohi).
 */
export function ProductPriceText({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const text = productPriceText(product);

  // Narx yo'qligi nofaollikdan boshqa narsa: mahsulot bor, shu bozorda
  // sotilmaydi. Jim qoldirilsa logist narxni so'ramay qo'shib yuboradi.
  if (text === null) {
    return <span className={cn("text-ink-faint", className)}>Narxi yo&apos;q</span>;
  }

  const original = product.price?.originalDisplay ?? null;

  return (
    <span className={cn("tabular", className)}>
      {text}
      {original ? (
        <s className="text-ink-faint ml-1 font-normal">{original}</s>
      ) : null}
    </span>
  );
}
