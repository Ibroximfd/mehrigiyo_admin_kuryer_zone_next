import { BadgeCheck } from "lucide-react";

import { CARD_TAG } from "@/features/orders/components/kanban/card-parts";
import { confirmationSummary, confirmationView } from "@/features/orders/confirmation";
import type { OrderConfirmation } from "@/features/orders/types";
import { cn } from "@/lib/utils";

/**
 * Kim tasdiqlagani — kartochka va ro'yxat qatoridagi ixcham chip (§4).
 * Mijoz o'zi ilovada tasdiqlagani — kuchli yashil "haqiqiy mijoz" belgisi;
 * to'liq matn (sabab, izoh, vaqt) — tooltipda.
 */
export function ConfirmationChip({
  confirmation,
  className,
}: {
  confirmation: OrderConfirmation | null;
  className?: string;
}) {
  const view = confirmationView(confirmation);
  if (!view) return null;
  return (
    <span
      title={confirmationSummary(view, { withNote: true })}
      className={cn(
        CARD_TAG,
        "max-w-full",
        view.byClient ? "bg-ok-soft text-ok" : "bg-info-soft text-info",
        view.isRealClient && "ring-ok ring-1 ring-inset",
        className,
      )}
    >
      {view.isRealClient ? <BadgeCheck className="size-3 shrink-0" aria-hidden /> : null}
      <span className="truncate">{view.chip}</span>
    </span>
  );
}
