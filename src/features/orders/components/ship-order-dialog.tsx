"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, TriangleAlert, Truck } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchChiefOptions } from "@/features/chief/api";
import { chiefForRegion } from "@/features/chief/types";
import { updateOrderWithWarning } from "@/features/orders/api";
import { assignWarningToasts } from "@/features/orders/use-order-zoning-actions";
import { warnIfPaymentChanged } from "@/features/orders/components/status-toast";
import { orderErrorMessage } from "@/features/orders/error-hints";
import { hasAddressIssue } from "@/features/orders/insights";
import type { LogistOrder } from "@/features/orders/types";
import { queryKeys } from "@/lib/query-keys";

/**
 * «Bosh kuryerga berish» — zakazni yo'lga chiqarishning yagona yo'li
 * (2026-10-30, egasi qarori). Logist kuryer tanlamaydi: zakaz viloyat bosh
 * kuryeriga beriladi (sukutda viloyatiga mos), kuryerni bosh kuryer
 * tanlaydi. Uch bandlik cheklist — xato yetkazmalar shu yerda to'xtaydi.
 */

const CHECKLIST = [
  "Mahsulotlar soni tarkibga mos",
  "Manzil aniq va to'liq",
  "Mijoz telefoni tekshirildi",
] as const;

export function ShipOrderDialog({
  order,
  onClose,
  onShipped,
}: {
  /** `null` — oyna yopiq. */
  order: LogistOrder | null;
  onClose: () => void;
  /** Muvaffaqiyatda chaqiriladi — chaqiruvchi keshini o'zi yangilaydi. */
  onShipped?: (updated: LogistOrder) => void;
}) {
  return (
    <Dialog open={order !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="w-[26rem] max-w-[calc(100vw-2rem)]">
        {order ? (
          // `key` — boshqa buyurtma ochilsa holat (cheklist, kuryer) qaytadan
          // boshlanadi: effektsiz, remount orqali.
          <ShipDialogBody
            key={order.id}
            order={order}
            onClose={onClose}
            onShipped={onShipped}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ShipDialogBody({
  order,
  onClose,
  onShipped,
}: {
  order: LogistOrder;
  onClose: () => void;
  onShipped?: (updated: LogistOrder) => void;
}) {
  const queryClient = useQueryClient();
  const baseId = useId();
  const [checked, setChecked] = useState<boolean[]>([false, false, false]);

  const region = order.deliveryInfo?.region ?? null;
  const chiefs = useQuery({
    queryKey: queryKeys.chiefOptions(null),
    queryFn: ({ signal }) => fetchChiefOptions(null, signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const chiefList = chiefs.data ?? [];
  // Sukut — viloyat so'rovidagi `is_default` (backend 2026-10-30 §2).
  const regional = useQuery({
    queryKey: queryKeys.chiefOptions(region),
    queryFn: ({ signal }) => fetchChiefOptions(region, signal),
    staleTime: 5 * 60_000,
    retry: false,
    enabled: region !== null,
  });
  const suggestedChief = chiefForRegion(regional.data ?? chiefList, region);
  const [chiefChoice, setChiefChoice] = useState<number | null>(null);
  const chiefId = chiefChoice ?? order.chiefCourier?.id ?? suggestedChief?.id ?? null;

  const submit = useMutation({
    mutationFn: () => updateOrderWithWarning(order.id, { status: "shipping", chiefCourierId: chiefId }),
    onSuccess: ({ order: updated, warnings }) => {
      toast.success(`${updated.orderNumber} · bosh kuryerga berildi`);
      assignWarningToasts(warnings);
      warnIfPaymentChanged(order, updated);
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      onShipped?.(updated);
      onClose();
    },
    onError: (error) =>
      toast.error(orderErrorMessage(error, "Yo'lga chiqarishda xatolik")),
  });

  const allChecked = checked.every(Boolean);
  const canSubmit = allChecked && chiefId !== null;
  const addressIssue = hasAddressIssue(order);

  return (
    <>
        <DialogTitle className="flex items-center gap-2">
          <Truck className="text-brand size-4.5" />
          Bosh kuryerga berish
        </DialogTitle>
        <DialogDescription>
          {order.orderNumber} — chiqishdan oldin tez tekshiruv.
        </DialogDescription>

        {addressIssue ? (
          <p className="bg-danger-soft text-danger mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 text-meta leading-relaxed">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            Bu buyurtmada manzil aniqlanmagan — avval mijozdan aniqlab, logist
            izohiga yozib qo&apos;ying.
          </p>
        ) : null}

        <div className="mt-3 space-y-3.5">
          {chiefs.isPending ? null : chiefList.length === 0 ? (
            <p className="bg-warn-soft text-warn flex items-start gap-2 rounded-lg px-3 py-2.5 text-meta leading-relaxed">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              Bosh kuryer tayinlanmagan — bosh logist viloyatga bosh kuryer bergach zakazni berasiz.
            </p>
          ) : (
            <Field label="Bosh kuryer">
              <Select
                value={chiefId === null ? "" : String(chiefId)}
                onValueChange={(value) => setChiefChoice(Number(value))}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Bosh kuryer tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {chiefList.map((chief) => (
                    <SelectItem key={chief.id} value={String(chief.id)}>
                      <span data-no-translit>{chief.fullName}</span>
                      {` · ${chief.couriers} kuryer`}
                      {chief.id === suggestedChief?.id ? " · viloyati mos" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-ink-faint mt-1.5 text-meta">
                {suggestedChief || chiefChoice !== null
                  ? "Bosh kuryer zakazni o'z kuryeriga taqsimlaydi. Yakunlash — avvalgidek sizda."
                  : "Bu viloyatga mos bosh kuryer yo'q — ro'yxatdan tanlang."}
              </p>
            </Field>
          )}

          {/* Cheklist — uchchala band belgilanmaguncha tugma yonmaydi. */}
          <div className="border-line space-y-2.5 rounded-lg border p-3">
            {CHECKLIST.map((label, index) => (
              <div key={label} className="flex items-center gap-2.5">
                <Checkbox
                  id={`${baseId}-${index}`}
                  checked={checked[index]}
                  onCheckedChange={(value) =>
                    setChecked((current) =>
                      current.map((item, i) =>
                        i === index ? value === true : item,
                      ),
                    )
                  }
                />
                <Label
                  htmlFor={`${baseId}-${index}`}
                  className="text-ink text-dense"
                >
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            disabled={!canSubmit || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Truck className="size-4" />
            )}
            Bosh kuryerga berish
          </Button>
        </div>
    </>
  );
}
