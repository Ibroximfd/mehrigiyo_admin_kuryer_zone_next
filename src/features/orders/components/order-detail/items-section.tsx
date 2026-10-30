"use client";

import { Package } from "lucide-react";
import { useState } from "react";

import { ItemPriceBadge } from "@/features/orders/components/item-price-badge";
import { DetailSection } from "@/features/orders/components/order-detail/section";
import { giftSourceLabel } from "@/features/orders/gift-source";
import { struckOriginalPrice } from "@/features/orders/item-pricing";
import type { LogistOrder, OrderItem } from "@/features/orders/types";
import { formatSom, groupThousands } from "@/lib/format";

/**
 * Tarkib: mahsulotlar (rasm, soni, qator summasi). Qator yetishmasa (backend to'liq yubormagan) ochiq aytiladi.
 *
 * Chegirma/aksiya bilan sotilgan qator belgi oladi (`−50%`, `1+1`); dona narxi
 * (asl narxi chizilgan holda) faqat server `unit_price` bersa chiqadi.
 */
export function ItemsSection({ order }: { order: LogistOrder }) {
  const { items, lineCount, itemCount, boxCount } = order;
  const missing = items.length > 0 && lineCount !== null && lineCount > items.length;
  const pieces = items.reduce((sum, item) => sum + item.quantity, 0) || itemCount;
  const meta = [boxCount ? `${boxCount} quti` : null, `${pieces} dona`].filter(Boolean).join(" · ");

  return (
    <DetailSection
      title={
        <>
          Tarkib
          <span className="text-ink-faint text-fine font-medium tracking-normal normal-case">{meta}</span>
        </>
      }
    >
      {missing ? (
        <p className="bg-warn-soft text-warn rounded-lg px-3 py-2 text-meta">
          Javobda {items.length} ta qator keldi, buyurtmada esa {lineCount} ta — tarkib to&apos;liq emas.
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="border-line text-ink-faint rounded-lg border border-dashed px-3.5 py-3 text-meta">
          {itemCount > 0
            ? `${itemCount} dona mahsulot bor, lekin javobda tarkib kelmadi.`
            : "Tarkib ko'rsatilmagan."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <ItemRow key={item.id ?? `${item.productId ?? item.name}-${index}`} item={item} />
          ))}
        </ul>
      )}
    </DetailSection>
  );
}

function ItemRow({ item }: { item: OrderItem }) {
  return (
    <li className="border-line flex items-center gap-3 rounded-lg border px-3 py-2.5">
      <ItemThumb item={item} />
      {/* Nom kesiladi, belgilar esa yo'q: uzun nomda ham chegirma ko'rinsin. */}
      <span className="text-ink flex min-w-0 flex-1 items-center gap-1.5 font-semibold">
        <span data-no-translit className="truncate">
          {item.name || "—"}
        </span>
        {item.isGift ? (
          <span className="bg-gold-soft text-gold text-micro shrink-0 rounded px-1.5 py-px">
            {giftSourceLabel(item.giftSource)}
          </span>
        ) : (
          <ItemPriceBadge item={item} />
        )}
      </span>
      <span className="text-ink-muted tabular shrink-0">×{item.quantity}</span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="text-ink tabular font-semibold">{formatSom(item.price)}</span>
        <UnitPrice item={item} />
      </span>
    </li>
  );
}

/**
 * Dona narxi — faqat server aytsa (`unit_price`); asl narx uning yonida
 * chiziladi. Server bermasa hech narsa: `price` (asl narx) yoki `total /
 * quantity` dona narxi deb ko'rsatilmaydi (`OrderItem.serverUnitPrice`).
 * Sovg'a qatorida ham yo'q — uning yorlig'i va `0` jami yetarli.
 */
function UnitPrice({ item }: { item: OrderItem }) {
  if (item.isGift || item.serverUnitPrice === null) return null;
  const struck = struckOriginalPrice({
    isGift: item.isGift,
    unitPrice: item.serverUnitPrice,
    originalPrice: item.originalPrice,
  });
  return (
    <span className="text-ink-faint tabular text-fine">
      {struck !== null ? <s className="mr-1">{groupThousands(struck)}</s> : null}
      {formatSom(item.serverUnitPrice)} / dona
    </span>
  );
}

/** Rasm yo'q yoki ochilmasa — bir xil zaxira belgi (singan rasm chiqmaydi). */
function ItemThumb({ item }: { item: OrderItem }) {
  const [failed, setFailed] = useState(false);
  if (!item.imageUrl || failed) {
    return (
      <span className="bg-surface-3 flex size-10 shrink-0 items-center justify-center rounded-lg">
        <Package className="text-ink-faint size-5" aria-hidden />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.imageUrl}
      alt={item.name || "Mahsulot"}
      loading="lazy"
      onError={() => setFailed(true)}
      className="bg-surface-3 size-10 shrink-0 rounded-lg object-cover"
    />
  );
}
