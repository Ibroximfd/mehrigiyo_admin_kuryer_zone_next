import { MapPinPen } from "lucide-react";

import { addressChangedBadge } from "@/features/orders/address";
import { CARD_TAG } from "@/features/orders/components/kanban/card-parts";
import type { LogistOrder } from "@/features/orders/types";
import { cn } from "@/lib/utils";

/**
 * "Manzil o'zgartirilgan (kuryer)" belgisi (`HUDUD_3` §2) — faqat
 * `delivery.address_changed_by` kelganda. Betaraf ohang: bu xato emas,
 * logist bilib qo'yishi kerak bo'lgan fakt; tafsilot — tarixda.
 */
export function AddressChangedBadge({
  order,
  className,
}: {
  order: Pick<LogistOrder, "deliveryInfo">;
  className?: string;
}) {
  const badge = addressChangedBadge(order);
  if (!badge) return null;
  return (
    <span
      className={cn(CARD_TAG, "bg-info-soft text-info max-w-full", className)}
      title={badge.hint}
    >
      <MapPinPen className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{badge.label}</span>
    </span>
  );
}
