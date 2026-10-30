"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { LoaderCircle, Truck } from "lucide-react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CallButton } from "@/components/kit/call-button";
import { fetchChiefOptions } from "@/features/chief/api";
import { updateOrderWithWarning } from "@/features/orders/api";
import { orderErrorMessage } from "@/features/orders/error-hints";
import type { LogistOrder } from "@/features/orders/types";
import { formatPhone } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

/**
 * Detaldagi bosh kuryer — logist almashtira oladi (zakaz yo'lda bo'lsa).
 * Kuryerni bosh kuryer tanlaydi (2026-10-30); u `CourierInfo` da alohida.
 */
export function InlineChiefPicker({
  order,
  disabled,
  onPatched,
}: {
  order: LogistOrder;
  disabled: boolean;
  onPatched: (order: LogistOrder) => void;
}) {
  const editable = !disabled && order.status === "shipping";
  const chiefs = useQuery({
    queryKey: queryKeys.chiefOptions(null),
    queryFn: ({ signal }) => fetchChiefOptions(null, signal),
    staleTime: 5 * 60_000,
    retry: false,
    enabled: editable,
  });

  const change = useMutation({
    mutationFn: (chiefCourierId: number) => updateOrderWithWarning(order.id, { chiefCourierId }),
    onSuccess: ({ order: updated }) => {
      toast.success(`${updated.orderNumber} · bosh kuryer almashtirildi`);
      onPatched(updated);
    },
    onError: (error) => toast.error(orderErrorMessage(error, "Bosh kuryerni almashtirishda xatolik")),
  });

  return (
    <div className="flex flex-col gap-1.5">
      {editable && (chiefs.data?.length ?? 0) > 0 ? (
        <Select
          value={order.chiefCourier ? String(order.chiefCourier.id) : ""}
          onValueChange={(value) => change.mutate(Number(value))}
          disabled={change.isPending}
        >
          <SelectTrigger className="h-9 w-full" aria-label="Bosh kuryer">
            {change.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            <SelectValue placeholder="Bosh kuryerga berilmagan" />
          </SelectTrigger>
          <SelectContent>
            {(chiefs.data ?? []).map((chief) => (
              <SelectItem key={chief.id} value={String(chief.id)}>
                <span data-no-translit>{chief.fullName}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="text-ink text-dense font-medium" data-no-translit>
          {order.chiefCourier?.fullName ?? "Bosh kuryerga berilmagan"}
        </span>
      )}
    </div>
  );
}

/**
 * Kuryer — faqat ko'rsatiladi (tanlovi bosh kuryerda): ism, telefon va
 * qo'ng'iroq. Muammo bo'lsa logist zakaz chatida yozadi.
 */
export function CourierInfo({ order }: { order: LogistOrder }) {
  const courier = order.courier;
  if (!courier) {
    return (
      <span className="text-ink-faint flex items-center gap-1.5 text-dense">
        <Truck className="size-3.5 shrink-0" aria-hidden />
        {order.chiefCourier ? "Bosh kuryer hali tanlamagan" : "Kuryer yo'q"}
      </span>
    );
  }
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-dense">
      <Truck className="text-ink-faint size-3.5 shrink-0" aria-hidden />
      <span className="text-ink truncate font-medium" data-no-translit>{courier.fullName}</span>
      {courier.phone ? (
        <>
          <span className="text-ink-faint tabular text-meta">{formatPhone(courier.phone)}</span>
          <CallButton phone={courier.phone} />
        </>
      ) : null}
    </span>
  );
}
