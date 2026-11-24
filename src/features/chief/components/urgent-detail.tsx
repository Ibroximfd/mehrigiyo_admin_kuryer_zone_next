"use client";

import { Check, LoaderCircle, Siren } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { OrderUrgent } from "@/features/orders/urgent";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import { useAckUrgent } from "../use-urgent-orders";

/**
 * Zakaz detalidagi shoshilinch blok (hujjat 123): sabab, kim va qachon bergani,
 * bosh kuryer qabul qilgani. Faol va tasdiqlanmagan bo'lsa «Qabul qildim» shu
 * yerdan ham bosiladi. Yopilgan zakazda belgi tarix sifatida ko'rinadi.
 */
export function UrgentDetail({ orderId, urgent }: { orderId: string; urgent: OrderUrgent }) {
  const ack = useAckUrgent();
  const waiting = urgent.isActive && urgent.ackedAt === null;

  return (
    <section
      aria-label="Shoshilinch zakaz"
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border p-3",
        urgent.isActive ? "border-danger/30 bg-danger-soft" : "border-line bg-subtle",
      )}
    >
      <p className={cn("flex items-center gap-1.5 text-dense font-semibold", urgent.isActive ? "text-danger" : "text-ink-muted")}>
        <Siren className="size-4 shrink-0" aria-hidden />
        {urgent.isActive ? "Shoshilinch zakaz" : "Shoshilinch edi"}
      </p>
      {urgent.reason ? (
        <p className="text-ink text-dense" data-no-translit>
          {urgent.reason}
        </p>
      ) : null}
      <p className="text-ink-muted flex flex-wrap gap-x-1.5 text-meta">
        <span>{"Logist: "}</span>
        <span data-no-translit>{urgent.setBy?.fullName || "—"}</span>
        {urgent.setAt ? (
          <>
            <span aria-hidden>·</span>
            <span>{formatDateTime(urgent.setAt)}</span>
          </>
        ) : null}
      </p>
      {urgent.ackedAt ? (
        <p className="text-ink-muted flex flex-wrap gap-x-1.5 text-meta">
          <span>{"Qabul qilindi: "}</span>
          {urgent.ackedBy?.fullName ? <span data-no-translit>{urgent.ackedBy.fullName}</span> : null}
          <span aria-hidden>·</span>
          <span>{formatDateTime(urgent.ackedAt)}</span>
        </p>
      ) : urgent.isActive ? (
        <p className="text-danger text-meta font-medium">Hali qabul qilinmagan</p>
      ) : null}
      {waiting ? (
        <Button disabled={ack.isPending} onClick={() => ack.mutate(orderId)} className="mt-1 w-full sm:w-auto sm:self-start">
          {ack.isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
          Qabul qildim
        </Button>
      ) : null}
    </section>
  );
}
