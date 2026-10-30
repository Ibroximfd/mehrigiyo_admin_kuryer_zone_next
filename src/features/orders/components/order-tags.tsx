"use client";

import { tagInfo } from "@/features/orders/tags";
import type { LogistOrder } from "@/features/orders/types";
import { cn } from "@/lib/utils";
import { useOrderTags } from "@/stores/tags-store";

/**
 * Buyurtma teglari (LOGIST-PLAN §14, backend §4.13).
 *
 * Manba — **server**: `tags` maydoni buyurtma bilan birga keladi va PATCH
 * bilan to'liq ro'yxat qayta yoziladi, ya'ni belgi filialning barcha
 * qurilmalarida bir xil ko'rinadi.
 *
 * Backend `tags` yubormasa (eski javob) komponent jimgina qurilma
 * xotirasiga tushadi (`stores/tags-store.ts`) — sayt baribir ishlaydi.
 */

/** Buyurtmaning amaldagi teglari: server bergani, bo'lmasa qurilmadagisi. */
export function useOrderTagValues(
  order: Pick<LogistOrder, "id" | "tags" | "tagsFromServer">,
): string[] {
  const local = useOrderTags(order.id);
  return order.tagsFromServer ? order.tags : local;
}

/**
 * Kartadagi ko'rinish — **nomi bilan** rangli yorliq.
 *
 * Ilgari bu yerda 8px'lik rangli nuqtalar turardi: ular kartada deyarli
 * ko'rinmasdi va rang yagona belgi bo'lgani uchun "qaysi teg" degan savolga
 * javob bermasdi (protanopiyada `recall` va `payment` bir xil). Endi teg
 * nomi yozilgan — rang faqat qo'shimcha belgi.
 */
export function OrderTagChips({
  order,
  className,
}: {
  order: Pick<LogistOrder, "id" | "tags" | "tagsFromServer">;
  className?: string;
}) {
  const tags = useOrderTagValues(order);
  if (tags.length === 0) return null;

  return (
    <span className={cn("flex shrink-0 flex-wrap items-center gap-1", className)}>
      {tags.map((tag) => {
        const info = tagInfo(tag);
        return (
          <span
            key={tag}
            title={info.label}
            style={{ "--accent": info.color } as React.CSSProperties}
            className={cn(
              "text-micro inline-flex items-center gap-1 rounded-full px-1.5 py-px font-semibold",
              "bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] text-[var(--accent)]",
            )}
          >
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ backgroundColor: info.color }}
            />
            {info.label}
          </span>
        );
      })}
    </span>
  );
}
