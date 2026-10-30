"use client";

import { useQuery } from "@tanstack/react-query";

import { ErrorView } from "@/components/kit/state-views";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchOrderDetail } from "@/features/orders/api";
import { EditOrderForm } from "@/features/orders/components/edit-order/edit-order-form";
import { errorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

/**
 * Tahrirlash oynasi (`?edit=`) — doska, ro'yxat va kartochkadan bir xil
 * ochiladi. To'liq ma'lumot detal keshidan (kartochka ochiq bo'lsa so'rov yo'q).
 */
export function EditOrderSheet({
  orderId,
  onClose,
}: {
  orderId: string | null;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: queryKeys.orderDetail(orderId ?? ""),
    queryFn: ({ signal }) => fetchOrderDetail(orderId as string, signal),
    enabled: orderId !== null,
  });

  return (
    <Sheet open={orderId !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
      >
        {detail.data && orderId ? (
          <EditOrderForm key={orderId} order={detail.data.order} onClose={onClose} />
        ) : detail.isError ? (
          <>
            <SheetTitle className="sr-only">Tahrirlash</SheetTitle>
            <SheetDescription className="sr-only">Buyurtmani yuklab bo&apos;lmadi</SheetDescription>
            <ErrorView
              message={errorMessage(detail.error, "Buyurtmani yuklashda xatolik")}
              onRetry={() => void detail.refetch()}
            />
          </>
        ) : (
          <div className="flex flex-col gap-3 p-5">
            <SheetTitle className="sr-only">Tahrirlash</SheetTitle>
            <SheetDescription className="sr-only">Buyurtma yuklanmoqda…</SheetDescription>
            <Skeleton className="h-8 w-1/2 rounded-lg" />
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-20 rounded-lg" />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
