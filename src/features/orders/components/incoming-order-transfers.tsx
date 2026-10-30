"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  Building2,
  Check,
  LoaderCircle,
  MapPin,
  X,
} from "lucide-react";
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
  acceptOrderTransfer,
  fetchOrders,
  rejectOrderTransfer,
} from "@/features/orders/api";
import { OrderAmount } from "@/features/orders/components/order-amount";
import { orderErrorMessage } from "@/features/orders/error-hints";
import type { LogistOrder } from "@/features/orders/types";
import { errorCode } from "@/lib/api-client";
import { formatPhone } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

/**
 * Kiruvchi buyurtma o'tkazmalari — A-oqimning qabul qiluvchi tomoni
 * (`BACKEND-LOGIST.md` §4.8, S6 qarori).
 *
 * Taklif qilingan buyurtma hali **bizning filialimizniki emas**: u doskaga
 * ham, ro'yxatga ham tushmaydi. Yagona ko'rinadigan joyi shu blok —
 * `GET logist/orders/?transfer=incoming`. Shuning uchun u javob kutayotgan
 * ish sifatida chizilgan (ogohlantirish ohangi) va ro'yxatning eng tepasida
 * turadi; taklif bo'lmasa blok umuman ko'rinmaydi.
 *
 * Qabul qilinsa buyurtma filialimizga o'tadi va doskada `confirmed`
 * ustunida paydo bo'ladi; rad etilsa yuboruvchida qulf yechiladi
 * (ikkala tomon WS bilan xabardor bo'ladi).
 */
export function IncomingOrderTransfers() {
  const [rejecting, setRejecting] = useState<LogistOrder | null>(null);

  const incoming = useQuery({
    queryKey: queryKeys.incomingOrderTransfers,
    queryFn: ({ signal }) =>
      fetchOrders({ transfer: "incoming", pageSize: 50 }, signal),
    retry: false,
    staleTime: 15_000,
  });

  // Backend bu filtrni bilmasa blok jimgina yo'qoladi — sahifa buzilmaydi.
  const missing = errorCode(incoming.error) === "endpoint_missing";
  const orders = incoming.data?.orders ?? [];

  // Blok odatda bo'sh bo'ladi — yuklanish paytida joy egallamaydi, aks holda
  // har sahifa ochilishida qatorlar sakrab tushardi.
  if (incoming.isPending || missing || incoming.isError) return null;
  if (orders.length === 0) return null;

  return (
    <>
      <section className="border-warn/35 bg-warn-soft mb-3 overflow-hidden rounded-xl border">
        <header className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 pt-3.5 pb-2">
          <ArrowDownLeft className="text-warn size-4 shrink-0" />
          <h2 className="text-ink text-title">Kiruvchi buyurtma takliflari</h2>
          <span className="bg-warn tabular text-fine rounded-full px-2 py-0.5 font-bold text-white">
            {orders.length}
          </span>
          <p className="text-ink-muted text-meta basis-full sm:basis-auto sm:pl-1">
            Qabul qilsangiz buyurtma doskangizga tushadi
          </p>
        </header>

        <ul className="divide-line/70 bg-surface/60 divide-y">
          {orders.map((order) => (
            <IncomingRow
              key={order.id}
              order={order}
              onReject={() => setRejecting(order)}
            />
          ))}
        </ul>
      </section>

      <RejectDialog
        order={rejecting}
        onClose={() => setRejecting(null)}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function IncomingRow({
  order,
  onReject,
}: {
  order: LogistOrder;
  onReject: () => void;
}) {
  const queryClient = useQueryClient();

  const accept = useMutation({
    mutationFn: () => acceptOrderTransfer(order.id),
    onSuccess: () => {
      toast.success(`${order.orderNumber} filialingizga qabul qilindi`);
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["transfers"] });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.incomingOrderTransfers,
      });
    },
    onError: (error) =>
      toast.error(orderErrorMessage(error, "Qabul qilishda xatolik")),
  });

  const fromFilial = order.transfer?.fromFilial?.name;
  const address = order.deliveryInfo?.address;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-ink tabular text-dense font-semibold" data-no-translit>
            {order.orderNumber || "—"}
          </span>
          <span className="text-gold tabular text-meta font-semibold">
            <OrderAmount order={order} />
          </span>
          {fromFilial ? (
            <span className="text-ink-muted text-meta flex items-center gap-1">
              <Building2 className="size-3.5 shrink-0" />
              <span data-no-translit>{fromFilial}</span>
            </span>
          ) : null}
        </div>

        <p className="text-ink-muted mt-1 flex items-center gap-1.5 truncate text-meta">
          <MapPin className="text-ink-faint size-3.5 shrink-0" />
          {address ? <span data-no-translit>{address}</span> : "Manzil ko'rsatilmagan"}
        </p>

        <p
          className="text-ink-faint mt-0.5 truncate text-fine"
          data-no-translit={order.client.fullName ? "" : undefined}
        >
          {order.client.fullName || "Mijoz"}
          {order.client.phone ? ` · ${formatPhone(order.client.phone)}` : ""}
          {order.transfer?.reason ? ` · ${order.transfer.reason}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-danger"
          disabled={accept.isPending}
          onClick={onReject}
        >
          <X className="size-3.5" />
          Rad etish
        </Button>
        <Button
          size="sm"
          disabled={accept.isPending}
          onClick={() => accept.mutate()}
        >
          {accept.isPending ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          Qabul qilish
        </Button>
      </div>
    </li>
  );
}

/** Rad etish — sabab majburiy (backend `reject_reason_required`). */
function RejectDialog({
  order,
  onClose,
}: {
  order: LogistOrder | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  const close = () => {
    setReason("");
    setTouched(false);
    onClose();
  };

  const submit = useMutation({
    mutationFn: () => rejectOrderTransfer(order?.id as string, reason.trim()),
    onSuccess: () => {
      toast.success("Taklif rad etildi — buyurtma yuboruvchida qoladi");
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["transfers"] });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.incomingOrderTransfers,
      });
      close();
    },
    onError: (error) =>
      toast.error(orderErrorMessage(error, "Rad etishda xatolik")),
  });

  return (
    <Dialog open={order !== null} onOpenChange={(next) => !next && close()}>
      <DialogContent className="w-[26rem] max-w-[calc(100vw-2rem)]">
        <DialogTitle className="flex items-center gap-2">
          <X className="text-danger size-4.5" />
          Taklifni rad etish
        </DialogTitle>
        <DialogDescription>
          {order?.orderNumber} — sabab yuboruvchi filialga ko&apos;rinadi va
          buyurtma o&apos;sha yerda qoladi.
        </DialogDescription>

        <div className="mt-3">
          <Field
            label="Sabab"
            hint="Sababsiz rad etib bo'lmaydi"
            error={touched && !reason.trim() ? "Sababni yozing" : undefined}
          >
            <textarea
              rows={2}
              autoFocus
              value={reason}
              onBlur={() => setTouched(true)}
              onChange={(event) => {
                setTouched(true);
                setReason(event.target.value);
              }}
              placeholder="Masalan: manzil bizning hududda emas"
              className={cn(inputClass, "h-auto resize-y py-2.5")}
            />
          </Field>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>
            Bekor qilish
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            Rad etish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
