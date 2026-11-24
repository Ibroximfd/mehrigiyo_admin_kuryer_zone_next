"use client";

import { Check, LoaderCircle, MapPin, Siren, Truck } from "lucide-react";

import { StatusPill } from "@/components/kit/status-pill";
import { Button } from "@/components/ui/button";
import { formatDeliveryAddress } from "@/features/orders/address";
import type { LogistOrder } from "@/features/orders/types";
import { useNowTick } from "@/hooks/use-now-tick";
import { formatSom } from "@/lib/format";

import { isOpenOrder, shortOrderNumber } from "../order-view";
import { URGENT_STAGE_LABELS, urgentAgo, urgentStage } from "../urgent";
import type { UrgentOrder, UrgentStage } from "../urgent";
import { useAckUrgent, useUrgentOrders } from "../use-urgent-orders";

const STAGE_COLORS: Record<UrgentStage, string> = {
  unacked: "var(--danger)",
  acked: "var(--warn)",
  with_courier: "var(--ok)",
};

/**
 * «Zakazlar» tepasidagi shoshilinch bo'lim (hujjat 123 §4): logist shoshilinch
 * qilib bergan HAMMA faol zakaz — oddiy ro'yxat filtri va sahifalashidan
 * mustaqil. Har birida bosqich: qabul qilinmagan → kuryerga bering → kuryerda.
 * Zakaz yo'q yoki server funksiyani bilmasa bo'lim chizilmaydi.
 */
export function UrgentSection({
  canDispatch,
  onOpen,
  onAssign,
}: {
  canDispatch: boolean;
  onOpen: (orderId: string) => void;
  onAssign: (order: LogistOrder) => void;
}) {
  const { board, counts } = useUrgentOrders();
  const ack = useAckUrgent();
  const now = useNowTick();
  if (!board || board.orders.length === 0) return null;

  return (
    <section aria-label="Shoshilinch zakazlar" className="border-danger/40 bg-surface overflow-hidden rounded-2xl border">
      <header className="bg-danger-soft text-danger flex flex-wrap items-center gap-x-2 gap-y-0.5 px-4 py-2.5">
        <Siren className="size-4 shrink-0" aria-hidden />
        <h2 className="text-dense font-semibold">Shoshilinch zakazlar</h2>
        <span className="tabular text-dense font-semibold">{counts.total}</span>
        {counts.unacked > 0 ? (
          <span className="ml-auto text-meta font-medium">{`${counts.unacked} tasi qabul qilinmagan`}</span>
        ) : null}
      </header>
      <ul className="divide-line divide-y">
        {board.orders.map((order) => (
          <UrgentRow
            key={order.id}
            order={order}
            now={now}
            reminderAfterMinutes={board.reminderAfterMinutes}
            canDispatch={canDispatch}
            acking={ack.isPending && ack.variables === order.id}
            onAck={() => ack.mutate(order.id)}
            onOpen={() => onOpen(order.id)}
            onAssign={() => onAssign(order)}
          />
        ))}
      </ul>
    </section>
  );
}

function UrgentRow({
  order,
  now,
  reminderAfterMinutes,
  canDispatch,
  acking,
  onAck,
  onOpen,
  onAssign,
}: {
  order: UrgentOrder;
  now: Date;
  reminderAfterMinutes: number;
  canDispatch: boolean;
  acking: boolean;
  onAck: () => void;
  onOpen: () => void;
  onAssign: () => void;
}) {
  const stage = urgentStage(order);
  const { urgent } = order;

  return (
    <li className="hover:bg-subtle flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-3.5 transition-colors sm:py-3">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${order.orderNumber}: batafsil`}
        className="focus-visible:ring-brand/40 min-w-0 flex-1 basis-64 rounded-lg text-left focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {/* Telefonda qisqa raqam (kuryer ilovasidagidek), to'liq — kompyuterda. */}
          <span className="text-ink tabular text-dense font-semibold sm:hidden" data-no-translit>
            {`#${shortOrderNumber(order.orderNumber)}`}
          </span>
          <span className="text-ink tabular text-dense hidden font-semibold sm:inline" data-no-translit>
            {order.orderNumber}
          </span>
          <StatusPill label={URGENT_STAGE_LABELS[stage]} color={STAGE_COLORS[stage]} size="sm" />
          {stage === "with_courier" && order.courier ? (
            <span className="text-ink-muted truncate text-meta" data-no-translit>
              {order.courier.fullName}
            </span>
          ) : null}
          <span className="text-ink tabular ml-auto shrink-0 text-dense font-semibold">{formatSom(order.payableAmount)}</span>
        </span>
        {urgent.reason ? (
          <span className="text-ink mt-1.5 block text-dense">
            <span className="text-ink-muted">{"Sabab: "}</span>
            <span data-no-translit>{urgent.reason}</span>
          </span>
        ) : null}
        <span className="text-ink mt-1 block truncate text-dense" data-no-translit>
          {order.client.fullName || order.client.phone}
        </span>
        <span className="text-ink-faint mt-0.5 flex min-w-0 items-center gap-1 text-meta">
          <MapPin className="size-3 shrink-0" aria-hidden />
          <span className="truncate" data-no-translit>{formatDeliveryAddress(order) ?? "Manzil yo'q"}</span>
        </span>
        <span className="text-ink-faint mt-1 flex flex-wrap gap-x-1.5 text-meta">
          {urgent.setBy?.fullName ? (
            <>
              <span>{"Logist: "}</span>
              <span data-no-translit>{urgent.setBy.fullName}</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <span>{urgentAgo(urgent.setAt, now)}</span>
        </span>
        {stage === "unacked" ? (
          <span className="text-danger mt-1 block text-meta">
            {`${reminderAfterMinutes} daqiqada qabul qilinmasa logistga xabar boradi`}
          </span>
        ) : null}
      </button>
      <span className="grid w-full shrink-0 auto-cols-fr grid-flow-col gap-2 sm:flex sm:w-auto sm:justify-end sm:gap-1.5">
        {stage === "unacked" ? (
          <Button disabled={acking} onClick={onAck} className="sm:h-8 sm:px-3 sm:text-meta">
            {acking ? <LoaderCircle className="animate-spin" /> : <Check />}
            Qabul qildim
          </Button>
        ) : null}
        {canDispatch && isOpenOrder(order) ? (
          <Button
            variant={stage === "acked" ? "default" : "outline"}
            onClick={onAssign}
            className="sm:h-8 sm:px-3 sm:text-meta"
          >
            <Truck />
            {order.courier ? "Almashtirish" : "Kuryerga berish"}
          </Button>
        ) : null}
      </span>
    </li>
  );
}
