import { Layers, MessageSquareDiff } from "lucide-react";

import {
  changeRequestKindLabel,
  isOpenChangeRequest,
} from "@/features/orders/change-request";
import { CARD_TAG } from "@/features/orders/components/kanban/card-parts";
import type { LogistOrder } from "@/features/orders/types";
import { cn } from "@/lib/utils";

/**
 * Eshikdagi ikki belgi — kartada, ro'yxatda va detalda bir xil:
 *
 *   «O'zgarish so'rovi» — kuryer mijoz oldida javob kutmoqda (`LOGIST_02`);
 *     so'rov ochiq ekan kuryer buyurtmani yopa olmaydi, shuning uchun belgi
 *     amber va yengil "nafas" oladi (`.card-fresh` bilan bir xil ritm).
 *   «To'xtash #N» — buyurtma boshqa zakaz bilan bitta manzilga birga
 *     yetkaziladi (`LOGIST_03`); kuryer haqi to'xtash bo'yicha.
 */
export function ChangeRequestChip({
  order,
  className,
}: {
  order: Pick<LogistOrder, "changeRequest">;
  className?: string;
}) {
  const request = order.changeRequest;
  if (!isOpenChangeRequest(request)) return null;
  return (
    <span
      title={`Kuryer so'rovi: ${changeRequestKindLabel(request.kind)}`}
      className={cn(
        CARD_TAG,
        "bg-amber-soft text-gold ring-amber-line animate-pulse ring-1",
        className,
      )}
    >
      <MessageSquareDiff className="size-3" aria-hidden />
      O&apos;zgarish so&apos;rovi
    </span>
  );
}

export function StopChip({
  order,
  className,
}: {
  order: Pick<LogistOrder, "stopId">;
  className?: string;
}) {
  if (order.stopId === null) return null;
  return (
    <span
      title="Bir manzilga birga yetkaziladi — kuryer haqi bitta"
      className={cn(CARD_TAG, "bg-info-soft text-info tabular", className)}
    >
      <Layers className="size-3" aria-hidden />
      Manzil #{order.stopId}
    </span>
  );
}
