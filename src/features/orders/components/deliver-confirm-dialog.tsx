"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleCheckBig, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { canCreditAddresses, defaultAddressCredit } from "@/features/orders/address-credit";
import { updateOrder } from "@/features/orders/api";
import { AddressCreditField } from "@/features/orders/components/address-credit-field";
import { isOpenChangeRequest } from "@/features/orders/change-request";
import { toastStatusChanged } from "@/features/orders/components/status-toast";
import { orderErrorMessage } from "@/features/orders/error-hints";
import { paymentView } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import { formatSom } from "@/lib/format";

/**
 * «Yetkazildi» — ikkinchi qadam tasdiq (`LOGIST_04` §1.3, A4).
 *
 * Doskada `Yetkazilgan` ustuniga sudrash bitta harakat edi va adashib
 * tashlangan karta Bazaga ketardi (komissiya yozilardi, operatorga xabar
 * borardi). Endi tashlash faqat shu oynani ochadi: logist kimga, qancha
 * va kim orqali yetkazilganini ko'rib, ataylab tasdiqlaydi.
 *
 * Shu oynada kuryerga yoziladigan manzil soni ham belgilanadi (sukut +1,
 * logist `0…9` qiladi) — `courier_addresses` (2026-10-29).
 */
export function DeliverConfirmDialog({
  order,
  onClose,
  onChanged,
}: {
  order: LogistOrder | null;
  onClose: () => void;
  onChanged?: (updated: LogistOrder) => void;
}) {
  return (
    <Dialog open={order !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="w-[28rem] max-w-[calc(100vw-2rem)]">
        {order ? (
          <DeliverBody
            key={order.id}
            order={order}
            onClose={onClose}
            onChanged={onChanged}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DeliverBody({
  order,
  onClose,
  onChanged,
}: {
  order: LogistOrder;
  onClose: () => void;
  onChanged?: (updated: LogistOrder) => void;
}) {
  const queryClient = useQueryClient();
  const pendingRequest = isOpenChangeRequest(order.changeRequest);
  const creditable = canCreditAddresses(order);
  const creditDefault = defaultAddressCredit("delivered", order);
  const [credit, setCredit] = useState(creditDefault);

  const deliver = useMutation({
    mutationFn: () =>
      updateOrder(order.id, {
        status: "delivered",
        ...(creditable ? { courierAddresses: credit } : {}),
      }),
    onSuccess: (updated) => {
      toastStatusChanged({
        order: updated,
        before: order,
        fromStatus: order.status,
        onUndo: (patch) =>
          updateOrder(order.id, patch)
            .then((reverted) => {
              onChanged?.(reverted);
              void queryClient.invalidateQueries({ queryKey: ["orders"] });
            })
            .catch((error: unknown) =>
              toast.error(orderErrorMessage(error, "Qaytarib bo'lmadi")),
            ),
      });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["statistics"] });
      // Dostavka/Baza kartasi WS (`lead_stage_changed`) bilan joyida ko'chadi.
      onChanged?.(updated);
      onClose();
    },
    onError: (error) =>
      toast.error(orderErrorMessage(error, "Statusni o'zgartirishda xatolik")),
  });

  const facts = [
    order.client.fullName || order.client.phone,
    order.courier?.fullName ?? null,
    paymentView(order).label,
  ].filter(Boolean);

  return (
    <>
      <div className="flex gap-3">
        <span
          aria-hidden
          className="bg-ok-soft mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg"
        >
          <CircleCheckBig className="text-ok size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <DialogTitle className="text-ink text-title">
            #{order.orderNumber} yetkazildimi?
          </DialogTitle>
          <DialogDescription className="text-ink-muted text-dense mt-1.5">
            {facts.join(" · ")}
          </DialogDescription>
        </div>
      </div>

      <dl className="border-line bg-canvas mt-4 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border px-3 py-2.5 text-dense">
        <dt className="text-ink-muted">To&apos;lanadigan summa</dt>
        <dd className="text-ink tabular text-right font-semibold">
          {formatSom(order.payableAmount)}
        </dd>
      </dl>

      {creditable && order.courier ? (
        <div className="mt-3">
          <AddressCreditField
            value={credit}
            defaultValue={creditDefault}
            courierName={order.courier.fullName}
            inStop={order.stopId !== null}
            disabled={deliver.isPending}
            onChange={setCredit}
          />
        </div>
      ) : null}

      {pendingRequest ? (
        <p
          role="alert"
          className="bg-warn-soft text-warn text-meta mt-3 rounded-lg px-3 py-2 leading-relaxed"
        >
          Kuryerning o&apos;zgarish so&apos;rovi javob kutmoqda — avval uni qabul
          qiling yoki rad eting, aks holda summa eskicha qoladi.
        </p>
      ) : null}

      <p className="bg-amber-soft text-gold text-meta mt-3 rounded-lg px-3 py-2 leading-relaxed">
        Tasdiqlansa karta Bazaga o&apos;tadi va komissiya yoziladi. Xato bo&apos;lsa —
        buyurtmani ochib, sabab bilan orqaga qaytarasiz.
      </p>

      <div className="mt-5 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={deliver.isPending}
          onClick={onClose}
        >
          Bekor qilish
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={deliver.isPending}
          onClick={() => deliver.mutate()}
        >
          {deliver.isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : null}
          Ha, yetkazildi
        </Button>
      </div>
    </>
  );
}
