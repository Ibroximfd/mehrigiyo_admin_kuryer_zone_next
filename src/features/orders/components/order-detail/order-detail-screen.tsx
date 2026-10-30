"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { ErrorView } from "@/components/kit/state-views";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchOrderDetail } from "@/features/orders/api";
import { OrderDetailView } from "@/features/orders/components/order-detail/order-detail-view";
import { errorCode, errorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

/**
 * Buyurtma kartochkasi (`?order=`) — dizayn `Logist_Order_Card` bo'yicha
 * **to'liq sahifa**: rail va tepa panel joyida, doska o'rnida chiziladi
 * (oyna/sheet emas, orqa fon xiralashmaydi). "← Buyurtmalar" doskaga
 * o'sha holatida qaytaradi — doska yashirin turadi, qayta yuklanmaydi.
 */
export function OrderDetailScreen({
  orderId,
  onBack,
  onOpenDiscussion,
  onEdit,
}: {
  orderId: string;
  onBack: () => void;
  onOpenDiscussion?: (orderId: string) => void;
  onEdit: (orderId: string) => void;
}) {
  const detail = useQuery({
    queryKey: queryKeys.orderDetail(orderId),
    queryFn: ({ signal }) => fetchOrderDetail(orderId, signal),
  });
  const number = detail.data?.order.orderNumber;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav
        aria-label="Yo'l"
        className="border-line bg-surface text-ink-muted flex h-12 shrink-0 items-center gap-2.5 border-b px-4 text-dense sm:px-6"
      >
        <button
          type="button"
          onClick={onBack}
          className="text-link hover:text-brand inline-flex shrink-0 items-center gap-1.5 rounded-md font-semibold"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Buyurtmalar
        </button>
        <span aria-hidden>/</span>
        <span aria-current="page" className="text-ink min-w-0 truncate font-semibold">
          {number ? `#${number}` : "Buyurtma"}
        </span>
      </nav>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-4 pt-5 pb-6 sm:px-6">
          {detail.isPending ? <DetailSkeleton /> : null}
          {detail.isError && !detail.data ? (
            <ErrorView
              message={
                errorCode(detail.error) === "order_not_found"
                  ? "Buyurtma topilmadi — o'chirilgan yoki boshqa filialga o'tgan bo'lishi mumkin."
                  : errorMessage(detail.error, "Buyurtmani yuklashda xatolik")
              }
              onRetry={() => void detail.refetch()}
              className="border-line bg-surface rounded-xl border"
            />
          ) : null}
          {detail.data ? (
            <OrderDetailView
              key={orderId}
              detail={detail.data}
              onEdit={() => onEdit(orderId)}
              onDiscuss={onOpenDiscussion ? () => onOpenDiscussion(orderId) : undefined}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <Skeleton className="h-8 w-2/3 rounded-lg" />
      <Skeleton className="h-9 rounded-lg" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,60fr)_minmax(0,40fr)]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
