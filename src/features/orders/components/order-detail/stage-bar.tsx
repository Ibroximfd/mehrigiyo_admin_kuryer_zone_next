"use client";

import { StageProgress } from "@/components/kit/stage-progress";
import type { Stage } from "@/components/kit/stage-progress";
import { Button } from "@/components/ui/button";
import { NEXT_ACTION_LABEL, canChangeStatus, nextFlowStatus } from "@/features/orders/permissions";
import { orderStatusInfo } from "@/features/orders/types";
import type { LogistOrder, OrderStatus } from "@/features/orders/types";
import { cn } from "@/lib/utils";

const STAGES: OrderStatus[] = ["confirmed", "shipping", "delivered"];

/**
 * Stage bar — joriy bosqich to'liq rangda, keyingi qadam uzuq ramkada
 * ("Yo'lga chiqarish →"), Atkaz alohida. Ruxsatli segment bosiladi (`02` §2.3).
 */
export function OrderStageBar({
  order,
  locked,
  onSelect,
}: {
  order: LogistOrder;
  locked: boolean;
  onSelect: (status: string) => void;
}) {
  const currentIndex = STAGES.indexOf(order.status as OrderStatus);
  const next = nextFlowStatus(order.status);

  const stages: Stage[] = STAGES.map((status, index) => {
    const info = orderStatusInfo(status);
    const state =
      index === currentIndex
        ? "current"
        : status === next
          ? "next"
          : currentIndex >= 0 && index < currentIndex
            ? "done"
            : "todo";
    const allowed = !locked && canChangeStatus(order.status, status);
    return {
      key: status,
      label:
        state === "next" ? `${NEXT_ACTION_LABEL[order.status as OrderStatus] ?? info.label} →` : info.label,
      state,
      mark: info.mark,
      onSelect: allowed ? () => onSelect(status) : undefined,
      title: allowed ? `«${info.label}» bosqichiga o'tkazish` : undefined,
    };
  });

  const cancelled = order.status === "cancelled";
  const canCancel = !locked && canChangeStatus(order.status, "cancelled");

  return (
    <div className="flex items-center gap-2.5">
      <StageProgress stages={stages} className="flex-1" />
      <Button
        variant="outline"
        disabled={!canCancel && !cancelled}
        onClick={canCancel ? () => onSelect("cancelled") : undefined}
        aria-pressed={cancelled}
        className={cn(
          "shrink-0",
          cancelled
            ? "bg-[var(--order-cancelled-mark)] border-transparent text-white hover:bg-[var(--order-cancelled-mark)]"
            : "border-danger/30 text-danger hover:bg-danger-soft",
        )}
      >
        Atkaz
      </Button>
    </div>
  );
}
