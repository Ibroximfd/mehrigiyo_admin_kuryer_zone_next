"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { updateOrder } from "@/features/orders/api";
import type { LogistOrderPatch } from "@/features/orders/api";
import { DeliveryAttemptDialog } from "@/features/orders/components/delivery-attempt-dialog";
import { AckStrip } from "@/features/orders/components/order-detail/ack-strip";
import { ClientSection } from "@/features/orders/components/order-detail/client-section";
import { CourierChatSection } from "@/features/orders/components/order-detail/courier-chat-section";
import { CourierProofSection } from "@/features/orders/components/order-detail/courier-proof-section";
import { DeliverySection } from "@/features/orders/components/order-detail/delivery-section";
import { DoorPaymentStrip } from "@/features/orders/components/order-detail/door-payment-strip";
import { OrderDetailHeader } from "@/features/orders/components/order-detail/detail-header";
import { ItemsSection } from "@/features/orders/components/order-detail/items-section";
import { OrderStageBar } from "@/features/orders/components/order-detail/stage-bar";
import { StatusSection } from "@/features/orders/components/order-detail/status-section";
import { OrderTimeline } from "@/features/orders/components/order-detail/timeline/order-timeline";
import { ReminderDialog } from "@/features/orders/components/reminder-dialog";
import { ShipOrderDialog } from "@/features/orders/components/ship-order-dialog";
import { StatusChangeDialogs } from "@/features/orders/components/status-change-dialogs";
import { toastStatusChanged } from "@/features/orders/components/status-toast";
import { TransferOrderDialog } from "@/features/orders/components/transfer-order-dialog";
import { orderErrorMessage } from "@/features/orders/error-hints";
import { ChangeRequestSection } from "@/features/orders/components/order-detail/change-request-section";
import { isTransferLocked, statusTransition, transitionNeedsDialog } from "@/features/orders/permissions";
import type { LogistOrderDetail } from "@/features/orders/types";
import { useOrderPatchCache } from "@/features/orders/use-order-patch-cache";

type Dialog = "attempt" | "transfer" | "reminder" | "ship" | null;

/**
 * Buyurtma kartochkasi mazmuni (dizayn `Logist_Order_Card`): sarlavha,
 * stage bar, chapda Holat · Mijoz · Tarkib · Yetkazish, o'ngda Tarix.
 * Status o'zgarishi matritsa orqali (`02` §2.3): `shipping` — cheklist
 * oynasi, bekor/qaytarish/tiklash — sabab oynasi, qolgani darhol + undo.
 */
export function OrderDetailView({
  detail,
  onDiscuss,
  onEdit,
}: {
  detail: LogistOrderDetail;
  onDiscuss?: () => void;
  onEdit: () => void;
}) {
  const { order } = detail;
  const applyPatch = useOrderPatchCache(order.id);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reasonTarget, setReasonTarget] = useState<string | null>(null);
  const locked = isTransferLocked(order);

  const changeStatus = useMutation({
    mutationFn: ({ patch }: { patch: LogistOrderPatch; from: string }) => updateOrder(order.id, patch),
    onSuccess: (updated, variables) => {
      toastStatusChanged({
        order: updated,
        before: order,
        fromStatus: variables.from,
        onUndo: (patch) => changeStatus.mutate({ patch, from: updated.status }),
      });
      applyPatch(updated);
    },
    onError: (error) => toast.error(orderErrorMessage(error, "Statusni o'zgartirishda xatolik")),
  });

  const selectStatus = (status: string) => {
    const kind = statusTransition(order.status, status);
    if (kind === null) return;
    if (kind === "ship") {
      setDialog("ship");
      return;
    }
    if (transitionNeedsDialog(kind)) {
      setReasonTarget(status);
      return;
    }
    changeStatus.mutate({ patch: { status }, from: order.status });
  };

  return (
    <>
      <div className="flex flex-col gap-3.5">
        <OrderDetailHeader order={order} onDiscuss={onDiscuss} onEdit={onEdit} />
        <OrderStageBar order={order} locked={locked} onSelect={selectStatus} />
        <AckStrip order={order} />
        <DoorPaymentStrip order={order} />
      </div>

      {/* Dizayn: 60/40 — ≥1280px ikki ustun, torroq ekranda Tarix pastga tushadi. */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,60fr)_minmax(0,40fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <ChangeRequestSection order={order} />
          <StatusSection
            order={order}
            locked={locked}
            pending={changeStatus.isPending}
            onSelectStatus={selectStatus}
            onReportAttempt={() => setDialog("attempt")}
            onReminder={() => setDialog("reminder")}
            onTransfer={() => setDialog("transfer")}
            onPatched={applyPatch}
          />
          <ClientSection order={order} />
          <ItemsSection order={order} />
          <DeliverySection order={order} locked={locked} onPatched={applyPatch} onEdit={onEdit} />
          <CourierProofSection order={order} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <CourierChatSection order={order} />
          <OrderTimeline orderId={order.id} detail={detail} />
        </div>
      </div>

      <DeliveryAttemptDialog
        orderId={order.id}
        open={dialog === "attempt"}
        onOpenChange={(open) => setDialog(open ? "attempt" : null)}
      />
      <TransferOrderDialog
        order={order}
        open={dialog === "transfer"}
        onOpenChange={(open) => setDialog(open ? "transfer" : null)}
      />
      <ReminderDialog
        order={order}
        open={dialog === "reminder"}
        onOpenChange={(open) => setDialog(open ? "reminder" : null)}
      />
      <ShipOrderDialog
        order={dialog === "ship" ? order : null}
        onClose={() => setDialog(null)}
        onShipped={applyPatch}
      />
      <StatusChangeDialogs
        request={reasonTarget ? { order, to: reasonTarget } : null}
        onClose={() => setReasonTarget(null)}
        onChanged={applyPatch}
        onShip={() => setDialog("ship")}
      />
    </>
  );
}
