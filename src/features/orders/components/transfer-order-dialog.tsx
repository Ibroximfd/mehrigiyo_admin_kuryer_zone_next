"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Field, inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requestOrderTransfer } from "@/features/orders/api";
import { orderErrorMessage } from "@/features/orders/error-hints";
import type { LogistOrder } from "@/features/orders/types";
import { fetchFilials } from "@/features/transfers/api";
import { errorCode } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

/**
 * Mijoz buyurtmasini boshqa filialga o'tkazish (A-oqim, LOGIST-PLAN §8.1).
 *
 * So'rov yuborilgach buyurtma yuboruvchi doskasida "O'tkazilmoqda" nishoni
 * bilan qulflanadi; qabul qiluvchi filial logisti `/transfers` da ko'radi.
 */
export function TransferOrderDialog({
  order,
  open,
  onOpenChange,
}: {
  order: LogistOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [filialId, setFilialId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const filials = useQuery({
    queryKey: queryKeys.filials,
    queryFn: ({ signal }) => fetchFilials(signal),
    enabled: open,
    staleTime: 5 * 60_000,
  });
  const filialsMissing = errorCode(filials.error) === "endpoint_missing";
  /** Bazada bitta filial bo'lsa ro'yxat bo'sh keladi — buni ochiq aytamiz. */
  const noOtherFilials =
    filials.isSuccess && (filials.data?.length ?? 0) === 0;

  const submit = useMutation({
    mutationFn: () =>
      requestOrderTransfer(order.id, {
        toFilialId: filialId as number,
        reason: reason.trim(),
      }),
    onSuccess: () => {
      toast.success(
        `${order.orderNumber} boshqa filialga taklif qilindi — javob kutilmoqda`,
      );
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["transfers"] });
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(orderErrorMessage(error, "O'tkazish so'rovida xatolik")),
  });

  const reasonError =
    reason.trim() || !filialId ? undefined : "Sababni yozing";
  const canSubmit = filialId !== null && reason.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[26rem] max-w-[calc(100vw-2rem)]">
        <DialogTitle className="flex items-center gap-2">
          <ArrowRightLeft className="text-brand size-4.5" />
          Filialga o&apos;tkazish
        </DialogTitle>
        <DialogDescription>
          {order.orderNumber} — qabul qiluvchi filial rozilik berguncha
          buyurtma qulflanadi.
        </DialogDescription>

        {filialsMissing ? (
          <p className="bg-warn-soft text-warn mt-3 rounded-lg px-3 py-2.5 text-meta leading-relaxed">
            Filiallararo o&apos;tkazish uchun backend hali chiqmagan — bu oqim
            backend §7–8 bilan birga ishga tushadi.
          </p>
        ) : noOtherFilials ? (
          <p className="bg-warn-soft text-warn mt-3 rounded-lg px-3 py-2.5 text-meta leading-relaxed">
            Boshqa filial yo&apos;q — o&apos;tkazish uchun tizimda kamida
            ikkita filial bo&apos;lishi kerak.
          </p>
        ) : (
          <div className="mt-3 space-y-3.5">
            <Field label="Qabul qiluvchi filial">
              <Select
                value={filialId === null ? "" : String(filialId)}
                onValueChange={(value) => setFilialId(Number(value))}
                disabled={filials.isPending}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Filial tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {(filials.data ?? []).map((filial) => (
                    <SelectItem key={filial.id} value={String(filial.id)}>
                      <span data-no-translit>{filial.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Sabab" error={reasonError}>
              <textarea
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Masalan: Manzil Samarqand hududida"
                className={cn(inputClass, "h-auto resize-y py-2.5")}
              />
            </Field>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          {!filialsMissing && !noOtherFilials ? (
            <Button
              disabled={!canSubmit || submit.isPending}
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              Yuborish
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
