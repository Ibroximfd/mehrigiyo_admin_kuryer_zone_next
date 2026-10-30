"use client";

import { ActiveCardBody } from "@/features/orders/components/kanban/active-card";
import { CardShell } from "@/features/orders/components/kanban/card-shell";
import type { CardProps } from "@/features/orders/components/kanban/card-types";
import {
  CancelledCardBody,
  DeliveredCardBody,
} from "@/features/orders/components/kanban/closed-cards";

/**
 * Doska kartochkasi — tasdiqlangan dizayn (`Logist_Kanban`): bosqichga
 * qarab uch xil mazmun, bitta ramka.
 */
export function OrderCard({
  dragging,
  overlay,
  ...props
}: CardProps & { dragging: boolean; overlay: boolean }) {
  const { order, locked, selected, actions, ack } = props;
  const Body =
    order.status === "delivered"
      ? DeliveredCardBody
      : order.status === "cancelled"
        ? CancelledCardBody
        : ActiveCardBody;

  return (
    <CardShell
      order={order}
      dragging={dragging}
      overlay={overlay}
      locked={locked}
      selected={selected}
      muted={order.status === "delivered"}
      fresh={ack?.fresh ?? false}
      onOpen={actions.onOpen}
    >
      <Body {...props} />
    </CardShell>
  );
}
