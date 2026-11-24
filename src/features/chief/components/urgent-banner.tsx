"use client";

import { LoaderCircle, Siren } from "lucide-react";
import Link from "next/link";

import { formatDeliveryAddress } from "@/features/orders/address";
import { useNowTick } from "@/hooks/use-now-tick";

import { shortOrderNumber } from "../order-view";
import { awaitsAck, urgentAgo } from "../urgent";
import { urgentOrderHref, useUrgentAlarm } from "../use-urgent-alarm";
import { useAckUrgent, useUrgentOrders } from "../use-urgent-orders";

/**
 * Tasdiqlanmagan shoshilinch zakaz banneri (hujjat 123 §4) — har sahifada, panel
 * karkasida. «Qabul qildim» bosilmaguncha yo'qolmaydi: yopish tugmasi ataylab
 * yo'q. Bir nechta bo'lsa eng eskisi ko'rsatiladi, tasdiqlangach keyingisi chiqadi.
 * Ovoz, sarlavha belgisi va bildirishnoma ham shu yerdan ulanadi (bir marta).
 */
export function UrgentBanner() {
  const { board } = useUrgentOrders();
  useUrgentAlarm(board);
  const ack = useAckUrgent();
  const now = useNowTick();

  const waiting = board?.orders.filter(awaitsAck) ?? [];
  const order = waiting[0];
  if (!order) return null;

  const rest = waiting.length - 1;
  const address = formatDeliveryAddress(order);
  const busy = ack.isPending && ack.variables === order.id;

  return (
    <div
      role="alert"
      className="bg-danger text-surface flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 md:px-6"
    >
      <Siren className="size-5 shrink-0 animate-pulse" aria-hidden />
      <div className="min-w-0 flex-1 basis-56">
        <p className="flex flex-wrap items-baseline gap-x-2 text-dense font-semibold">
          <span>Shoshilinch zakaz</span>
          <span className="tabular" data-no-translit>{`#${shortOrderNumber(order.orderNumber)}`}</span>
          <span className="text-meta font-normal opacity-85">{urgentAgo(order.urgent.setAt, now)}</span>
        </p>
        <p className="truncate text-meta" data-no-translit>
          {[address, order.urgent.reason].filter(Boolean).join(" — ")}
        </p>
        {rest > 0 ? (
          <p className="text-meta font-medium">{`Yana ${rest} ta shoshilinch zakaz qabul qilinmagan`}</p>
        ) : null}
      </div>
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
        <Link
          href={urgentOrderHref(order.id)}
          className="border-surface/50 hover:bg-surface/15 focus-visible:ring-surface/60 inline-flex h-(--control-h) items-center justify-center rounded-lg border px-4 text-dense font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          Ochish
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={() => ack.mutate(order.id)}
          className="bg-surface text-danger hover:bg-surface/90 focus-visible:ring-surface/60 inline-flex h-(--control-h) items-center justify-center gap-2 rounded-lg px-4 text-dense font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-70"
        >
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          Qabul qildim
        </button>
      </div>
    </div>
  );
}
