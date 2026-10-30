"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import type { LogistOrder } from "@/features/orders/types";
import { createStop } from "@/features/stops/api";
import { stopErrorMessage } from "@/features/stops/error-hints";
import { stopMergeBlocker } from "@/features/stops/merge-rules";

/**
 * Ommaviy panelda «To'xtash» — tanlangan buyurtmalarni bitta manzilga
 * birga yetkazish. Qoidaga to'g'ri kelmasa tugma o'chiq, sababi `title` da.
 */
export function MergeStopButton({
  orders,
  className,
  onDone,
}: {
  orders: LogistOrder[];
  className: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const blocker = stopMergeBlocker(orders);

  const merge = useMutation({
    mutationFn: () => createStop(orders.map((order) => order.id)),
    onSuccess: (stop) => {
      toast.success(stop ? `Manzil #${stop.id} birlashtirildi` : "Manzil birlashtirildi");
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["stops"] });
      onDone();
    },
    onError: (error) => toast.error(stopErrorMessage(error, "Manzilni birlashtirishda xatolik")),
  });

  if (orders.length < 2) return null;

  return (
    <button
      type="button"
      className={className}
      disabled={blocker !== null || merge.isPending}
      title={blocker ?? "Bir manzilga birga yetkaziladi — kuryer haqi bitta"}
      onClick={() => merge.mutate()}
    >
      {merge.isPending ? (
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <Layers className="size-3.5" aria-hidden />
      )}
      Bir manzil
    </button>
  );
}
