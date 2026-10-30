import { itemPriceBadge } from "@/features/orders/item-pricing";
import type { ItemPriceBadgeTone, ItemPricingFacts } from "@/features/orders/item-pricing";
import { cn } from "@/lib/utils";

/**
 * Qator yonidagi chegirma/aksiya belgisi: qizil `−50%` (katalog chegirmasi)
 * yoki aksiya tonidagi `1+1` / "Aksiya". Qoida `item-pricing.ts` da; bu yerda
 * faqat chizish. Belgi bo'lmasa (`null`) qator avvalgidek qoladi.
 */
const TONE_CLASS: Record<ItemPriceBadgeTone, string> = {
  discount: "bg-danger-soft text-danger",
  promo: "bg-gold-soft text-gold",
};

export function ItemPriceBadge({ item }: { item: ItemPricingFacts }) {
  const badge = itemPriceBadge(item);
  if (!badge) return null;

  return (
    <span
      // Admin matni ("1+1", "Kuzgi aksiya") — server ma'lumoti, o'girilmaydi.
      data-no-translit={badge.fromServer || undefined}
      className={cn("text-micro tabular shrink-0 rounded px-1.5 py-px font-semibold", TONE_CLASS[badge.tone])}
    >
      {badge.label}
    </span>
  );
}
