"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Field, inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { canCreditAddresses } from "@/features/orders/address-credit";
import { changeOrderAddresses } from "@/features/orders/api";
import { AddressCreditField } from "@/features/orders/components/address-credit-field";
import { DetailRow } from "@/features/orders/components/order-detail/section";
import { orderErrorMessage } from "@/features/orders/error-hints";
import type { LogistOrder } from "@/features/orders/types";

/**
 * «Kuryerga manzil» — yakunlangan zakazda yozilgan son va uni keyin
 * o'zgartirish (2026-10-30 §2.3b): atkaz bo'lgan, lekin kuryer uyiga
 * borgan — logist `+1` beradi. So'nggi qaror ustun, sana — yakunlash kuni.
 */
export function AddressCreditRow({
  order,
  locked,
  onChanged,
}: {
  order: LogistOrder;
  locked: boolean;
  onChanged: (updated: LogistOrder) => void;
}) {
  const [open, setOpen] = useState(false);
  const finalized = order.status === "delivered" || order.status === "cancelled";
  if (!finalized || !canCreditAddresses(order)) return null;
  const current = order.review.courierAddresses ?? 0;

  return (
    <DetailRow label="Kuryerga manzil">
      <span className="flex items-center gap-2">
        <span className="tabular font-semibold">{current > 0 ? `+${current}` : "0"}</span>
        {order.review.courierAddressesManual ? <span className="text-ink-faint text-fine">qo&apos;lda</span> : null}
        {!locked ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-link hover:text-brand text-meta font-medium"
          >
            O&apos;zgartirish
          </button>
        ) : null}
      </span>
      {open ? (
        <ChangeAddressesDialog
          order={order}
          current={current}
          onClose={() => setOpen(false)}
          onChanged={onChanged}
        />
      ) : null}
    </DetailRow>
  );
}

function ChangeAddressesDialog({
  order,
  current,
  onClose,
  onChanged,
}: {
  order: LogistOrder;
  current: number;
  onClose: () => void;
  onChanged: (updated: LogistOrder) => void;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(current);
  const [note, setNote] = useState("");
  const save = useMutation({
    mutationFn: () => changeOrderAddresses(order.id, value, note.trim()),
    onSuccess: (updated) => {
      onChanged(updated);
      void queryClient.invalidateQueries({ queryKey: ["statistics"] });
      toast.success("Kuryer manzil soni yangilandi");
      onClose();
    },
    onError: (error) => toast.error(orderErrorMessage(error, "Manzil sonini o'zgartirib bo'lmadi")),
  });

  return (
    <Dialog open onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="w-[26rem] max-w-[calc(100vw-2rem)]">
        <DialogTitle className="flex items-center gap-2">
          <MapPin className="text-brand size-4.5" />
          Kuryerga manzil
        </DialogTitle>
        <DialogDescription>
          #{order.orderNumber} — yakunlangan kun hisobiga yoziladi, so&apos;nggi qaror ustun.
        </DialogDescription>
        <div className="mt-3 space-y-3.5">
          <AddressCreditField
            value={value}
            defaultValue={current}
            courierName={order.courier?.fullName ?? ""}
            inStop={false}
            disabled={save.isPending}
            onChange={setValue}
          />
          <Field label="Izoh" hint="Masalan: uyiga yetib borgan">
            <input value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button disabled={save.isPending || value === current} onClick={() => save.mutate()}>
            {save.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Saqlash
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
