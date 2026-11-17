import { Fragment } from "react";

import { GIFT_MARK } from "@/features/orders/gift-source";
import { formatItemQuantity } from "@/features/orders/item-unit";
import { cn } from "@/lib/utils";

import type { ProductsPreview } from "../order-view";

/**
 * «Gepatofit × 2 karobka (6 dona), 🎁 Kremi × 1 dona +2» — kartadagi qisqa
 * mahsulotlar qatori. Bitta satr emas, bo'laklar: mahsulot nomi tarjima
 * qilinmaydi (`data-no-translit`), birlik («karobka», «dona») esa DOM
 * tarjimonidan o'tadi.
 */
export function OrderProductsLine({ preview, className }: { preview: ProductsPreview; className?: string }) {
  if (preview.shown.length === 0) return null;
  return (
    <span className={cn("truncate", className)}>
      {preview.shown.map((item, index) => (
        <Fragment key={item.id ?? `${item.productId}-${index}`}>
          {index > 0 ? ", " : null}
          {item.isGift ? `${GIFT_MARK} ` : null}
          <span data-no-translit>{item.name}</span>
          {" × "}
          <span>{formatItemQuantity(item)}</span>
        </Fragment>
      ))}
      {preview.rest > 0 ? ` +${preview.rest}` : null}
    </span>
  );
}
