"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { assignChiefOrder, fetchChiefCandidates } from "@/features/chief/api";
import { CourierCandidatesList } from "@/features/couriers/components/courier-candidates";
import type { CourierCandidate } from "@/features/couriers/candidates";
import { assignWarningToasts } from "@/features/orders/use-order-zoning-actions";
import type { LogistOrder } from "@/features/orders/types";
import { errorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

/**
 * Zakazni o'z kuryeriga berish — logistning nomzodlar oynasi bilan bir xil,
 * faqat manba bosh kuryer jamoasi (`chief/orders/{id}/candidates/`).
 */
export function ChiefAssignDialog({
  order,
  onClose,
}: {
  order: LogistOrder | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const assign = useMutation({
    mutationFn: (candidate: CourierCandidate) => assignChiefOrder(order!.id, candidate.courier.id),
    onSuccess: ({ order: updated, warnings }, candidate) => {
      toast.success(`${updated.orderNumber} · ${candidate.courier.fullName}`);
      assignWarningToasts(warnings);
      void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      onClose();
    },
    onError: (error) => toast.error(errorMessage(error, "Kuryerga biriktirishda xatolik")),
  });

  return (
    <Dialog open={order !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[85vh] w-[30rem] max-w-[calc(100vw-2rem)] flex-col">
        <DialogTitle>Kuryerga berish</DialogTitle>
        <DialogDescription>
          {order ? `${order.orderNumber} — jamoangizdan mos kuryer` : ""}
        </DialogDescription>
        {order ? (
          <div className="scrollbar-thin -mx-1 mt-2 min-h-0 flex-1 overflow-y-auto px-1">
            <CourierCandidatesList
              orderId={order.id}
              currentCourierId={order.courier?.id ?? null}
              pendingCourierId={assign.isPending ? (assign.variables?.courier.id ?? null) : null}
              disabled={assign.isPending}
              onPick={(candidate) => assign.mutate(candidate)}
              source={{
                queryKey: queryKeys.chiefCandidates(order.id),
                fetch: fetchChiefCandidates,
              }}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
