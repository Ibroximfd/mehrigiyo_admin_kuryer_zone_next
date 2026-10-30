"use client";

import { useEffect } from "react";

import { isAckFallback, myAckAt } from "@/features/orders/acknowledgement";
import { AckButton, AckedByLine, FreshBadge } from "@/features/orders/components/kanban/ack-parts";
import type { CardAckState } from "@/features/orders/components/kanban/ack-parts";
import type { LogistOrder } from "@/features/orders/types";
import { useOrderAcks } from "@/features/orders/use-order-acks";
import { cn } from "@/lib/utils";

/** "Oldim" tugmasi mantiqli bosqichlar — logist ishi hali boshlanmagan. */
const ACKABLE = new Set(["pending", "confirmed"]);

/**
 * Kartochka tepasidagi "Oldim" qatori: yangi bo'lsa amber ogohlantirish va
 * tugma, olingan bo'lsa kim/qachon. Kartochka ochilishi (va ochiq turganda
 * yangilanishi) — "ko'rildi": o'zgarish nuqtasi o'chadi.
 */
export function AckStrip({ order }: { order: LogistOrder }) {
  const acks = useOrderAcks();
  const { markSeen } = acks;
  const updatedAt = order.updatedAt?.getTime() ?? 0;

  useEffect(() => {
    markSeen(order.id);
  }, [markSeen, order.id, updatedAt]);

  const state: CardAckState = {
    fresh: acks.isFresh(order),
    acks: acks.acksOf(order),
    unseen: false,
    pending: acks.pendingId === order.id,
    fallback: isAckFallback(order),
    onAcknowledge: () => acks.acknowledge(order),
  };
  const mine = myAckAt(order, acks.userId, acks.local) !== null;
  const canAck = ACKABLE.has(order.status) && !mine;

  if (!state.fresh && state.acks.length === 0 && !canAck) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2.5 rounded-lg border px-3.5 py-2.5",
        state.fresh ? "border-amber-line bg-amber-soft" : "border-line bg-surface",
      )}
    >
      {state.fresh ? (
        <>
          <FreshBadge />
          <span className="text-gold text-dense font-medium">
            Hali hech kim olmagan — ishga olsangiz «Oldim» ni bosing
          </span>
        </>
      ) : (
        <AckedByLine state={state} />
      )}
      {canAck ? <AckButton state={state} className="ml-auto" /> : null}
      {state.fallback && mine ? (
        <span className="text-ink-faint ml-auto text-fine">belgi shu qurilmada</span>
      ) : null}
    </div>
  );
}
