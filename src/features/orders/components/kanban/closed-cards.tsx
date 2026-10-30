"use client";

import {
  CARD_TAG,
  CardAmountRow,
  CardField,
  CardHead,
  ClientLine,
  CreatorTag,
} from "@/features/orders/components/kanban/card-parts";
import type { CardProps } from "@/features/orders/components/kanban/card-types";
import { PaymentBadge } from "@/features/orders/components/payment-badge";
import { creatorKindLabel } from "@/features/orders/creator";
import { cancelReasonLabel } from "@/features/orders/reasons";
import type { LogistOrder } from "@/features/orders/types";
import { formatShortDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const FOOTER =
  "border-line mt-0.5 flex items-center justify-between border-t border-dashed pt-1.5 text-meta";

const LINK =
  "text-link hover:text-brand rounded-sm font-medium transition-colors duration-(--dur-micro)";

function stop(handler: () => void) {
  return (event: React.MouseEvent) => {
    event.stopPropagation();
    handler();
  };
}

/** Yetkazilgan: summa, kim yaratgan, mijoz, qachon/kim yetkazdi + tahrir/qaytarish. */
export function DeliveredCardBody({ order, selected, selectionActive, actions }: CardProps) {
  return (
    <>
      <CardHead
        order={order}
        selected={selected}
        selectionActive={selectionActive}
        onToggleSelect={actions.onToggleSelect}
        onOpen={actions.onOpen}
        onDiscuss={actions.onDiscuss}
      />
      <CardAmountRow amount={order.payableAmount}>
        <PaymentBadge order={order} compact className="min-w-0 shrink" />
      </CardAmountRow>
      <div className="flex flex-wrap gap-1.5">
        <CreatorTag creator={order.createdBy} />
      </div>
      <ClientLine order={order} inline />
      <div className="grid grid-cols-2 gap-1.5">
        <CardField label="Yetkazildi">
          <span className="tabular">
            {order.deliveredAt ? formatShortDateTime(order.deliveredAt) : "—"}
          </span>
        </CardField>
        <CardField label="Kuryer">
          <span className="block truncate" data-no-translit>
            {order.courier?.fullName ?? "—"}
          </span>
          {order.chiefCourier ? (
            <span className="text-ink-faint block truncate text-fine">
              {"bosh kuryer · "}
              <span data-no-translit>{order.chiefCourier.fullName}</span>
            </span>
          ) : null}
        </CardField>
      </div>
      <div className={FOOTER}>
        <button type="button" className={LINK} onClick={stop(() => actions.onEdit(order))}>
          Tahrirlash
        </button>
        <button
          type="button"
          className="text-ink-faint hover:text-ink rounded-sm transition-colors duration-(--dur-micro)"
          onClick={stop(() => actions.onRequestReason(order, "shipping"))}
        >
          Orqaga qaytarish…
        </button>
      </div>
    </>
  );
}

function cancelledBy(order: LogistOrder): string {
  const type = order.cancel?.byType;
  if (type === "client") return "Mijoz";
  if (type) return creatorKindLabel(type) || type;
  return order.cancel?.by ?? "Atkaz";
}

/** Sabab yorlig'i tarjima qilinadi, logist yozgan izoh esa yo'q. */
function CancelReasonText({ order }: { order: LogistOrder }) {
  const label = cancelReasonLabel(order.cancel?.reason);
  const note = order.cancel?.note;
  if (!label && !note) return <>—</>;
  return (
    <>
      {label}
      {label && note ? " · " : null}
      {note ? <span data-no-translit>«{note}»</span> : null}
    </>
  );
}

/** Atkaz: chizilgan summa, kim bekor qilgani, sabab, mijoz + tiklash. */
export function CancelledCardBody({ order, selected, selectionActive, actions }: CardProps) {
  return (
    <>
      <CardHead
        order={order}
        selected={selected}
        selectionActive={selectionActive}
        onToggleSelect={actions.onToggleSelect}
        onOpen={actions.onOpen}
        onDiscuss={actions.onDiscuss}
      />
      <CardAmountRow amount={order.payableAmount} struck>
        <span className={cn(CARD_TAG, "bg-danger-soft text-danger")}>{cancelledBy(order)}</span>
      </CardAmountRow>
      <CardField label="Sabab">
        <CancelReasonText order={order} />
      </CardField>
      <ClientLine order={order} inline />
      <div className={FOOTER}>
        <button
          type="button"
          className={LINK}
          onClick={stop(() => actions.onRequestReason(order, "confirmed"))}
        >
          Tiklash…
        </button>
        <span className="text-ink-faint">tarixda saqlanadi</span>
      </div>
    </>
  );
}
