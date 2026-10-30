"use client";

import { Ban, BadgeCheck, Check, MapPin, Truck } from "lucide-react";

import {
  AckButton,
  AckedByLine,
  FreshBadge,
} from "@/features/orders/components/kanban/ack-parts";
import { formatDeliveryAddress } from "@/features/orders/address";
import { AddressChangedBadge } from "@/features/orders/components/address-changed-badge";
import { AddressIssueBadge } from "@/features/orders/components/address-issue-badge";
import { AppPresenceTag } from "@/features/orders/components/app-presence-tag";
import { ConfirmationChip } from "@/features/orders/components/confirmation-chip";
import { ChangeRequestChip, StopChip } from "@/features/orders/components/door-signals";
import {
  CARD_TAG,
  CardAmountRow,
  CardField,
  CardHead,
  ClientLine,
  CourierLine,
  CreatorTag,
} from "@/features/orders/components/kanban/card-parts";
import type { CardProps } from "@/features/orders/components/kanban/card-types";
import { PendingReasonChip } from "@/features/orders/components/order-meta-chips";
import { PaymentBadge } from "@/features/orders/components/payment-badge";
import { isInReview, reportedDelivered, reviewLabel } from "@/features/orders/review";
import {
  DistrictGuessChip,
  SuggestionChip,
  ZoneBadges,
} from "@/features/orders/components/zoning/zone-parts";
import {
  attemptsSummary,
  itemsSummary,
  overdueDays,
} from "@/features/orders/card-signals";
import { deliveryDateText } from "@/features/orders/delivery-labels";
import { hasAddressIssue } from "@/features/orders/insights";
import { deliveryDateTone } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import { cn } from "@/lib/utils";

/** Faol bosqich (Kutilmoqda · Tasdiqlangan · Yo'lga chiqarilgan) kartochkasi. */
export function ActiveCardBody({
  order,
  locked,
  selected,
  selectionActive,
  actions,
  ack,
}: CardProps) {
  const shipping = order.status === "shipping";
  const overdue = deliveryDateTone(order) === "overdue";

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

      {ack?.fresh ? (
        <div className="flex items-center justify-between gap-1.5">
          <FreshBadge />
          <AckButton state={ack} />
        </div>
      ) : null}

      <CardAmountRow amount={order.payableAmount}>
        <PaymentBadge order={order} compact className="min-w-0 shrink" />
      </CardAmountRow>

      <StatusChips order={order} />
      <ClientLine order={order} />
      <AddressField order={order} />
      <ZoneBadges order={order} />
      <DistrictGuessChip order={order} />

      <div className="grid grid-cols-2 gap-1.5">
        <CardField label="Yetk. sana">
          <span
            className={cn(
              "tabular font-semibold",
              overdue ? "text-danger" : "text-ink",
            )}
          >
            {deliveryDateText(order) || "—"}
          </span>
        </CardField>
        {shipping ? (
          <CardField label="Urinishlar">{attemptsSummary(order)}</CardField>
        ) : (
          <CardField label="Tarkib">
            <span className="line-clamp-2">{itemsSummary(order)}</span>
          </CardField>
        )}
      </div>

      <CourierLine order={order} withAvatar={shipping} />
      {!locked ? <SuggestionChip order={order} /> : null}
      {ack && !ack.fresh ? <AckedByLine state={ack} /> : null}

      {!locked ? <NextActionButton order={order} actions={actions} /> : null}
    </>
  );
}

function StatusChips({ order }: { order: LogistOrder }) {
  const late = order.status === "shipping" ? overdueDays(order) : 0;

  return (
    <div className="flex flex-wrap gap-1.5">
      {isInReview(order) ? (
        <span className={cn(CARD_TAG, "bg-amber-soft text-gold")} title="Logist yakunlashi kutilmoqda">
          {reviewLabel(order)}
        </span>
      ) : null}
      <ChangeRequestChip order={order} />
      <StopChip order={order} />
      <CreatorTag creator={order.createdBy} />
      <AppPresenceTag client={order.client} compact />
      {order.status === "pending" ? (
        <PendingReasonChip reason={order.pendingReason} />
      ) : null}
      {order.status !== "pending" ? (
        <ConfirmationChip confirmation={order.confirmation} />
      ) : null}
      {late > 0 ? (
        <span className={cn(CARD_TAG, "bg-danger-soft text-danger")}>
          Kechikkan · {late} kun
        </span>
      ) : null}
    </div>
  );
}

function AddressField({ order }: { order: LogistOrder }) {
  const info = order.deliveryInfo;
  const region = info?.regionDisplay ?? info?.region ?? null;
  if (hasAddressIssue(order)) {
    return (
      <CardField label="Manzil">
        <span className="text-danger font-medium">⚠ Manzil aniqlanmagan</span>
      </CardField>
    );
  }
  // Viloyat — belgi; qolgani bir xil tartibda: tuman, mahalla, ko'cha.
  const address = formatDeliveryAddress(order, { withRegion: false });
  return (
    <CardField label="Manzil">
      {region ? (
        <span className="bg-brand-soft text-brand inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-dense font-bold">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{region}</span>
        </span>
      ) : null}
      {address ? (
        <span data-no-translit className={cn("line-clamp-2", region && "mt-1 block")}>
          {address}
        </span>
      ) : null}
      <span className="mt-1 flex flex-wrap items-center gap-1">
        <AddressIssueBadge order={order} />
        <AddressChangedBadge order={order} />
      </span>
    </CardField>
  );
}

function NextActionButton({
  order,
  actions,
}: {
  order: LogistOrder;
  actions: CardProps["actions"];
}) {
  // «Jarayonda»: kuryer/operator so'ragan natijani logist tasdiqlaydi.
  if (isInReview(order) && !reportedDelivered(order)) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          actions.onRequestReason(order, "cancelled");
        }}
        className="border-danger/40 text-danger hover:bg-danger-soft mt-0.5 flex h-7.5 items-center justify-center gap-1.5 rounded-lg border text-meta font-semibold transition-colors duration-(--dur-micro)"
      >
        <Ban className="size-3.5" aria-hidden />
        Atkazni tasdiqlash
      </button>
    );
  }
  if (order.status === "pending") {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          actions.onRequestReason(order, "confirmed");
        }}
        className="border-brand/40 text-brand hover:bg-brand-soft mt-0.5 flex h-7.5 items-center justify-center gap-1.5 rounded-lg border text-meta font-semibold transition-colors duration-(--dur-micro)"
      >
        <BadgeCheck className="size-3.5" aria-hidden />
        Tasdiqlash
      </button>
    );
  }
  if (order.status === "confirmed") {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          actions.onShip(order);
        }}
        className="bg-brand text-brand-ink hover:bg-brand-hover mt-0.5 flex h-7.5 items-center justify-center gap-1.5 rounded-lg text-meta font-semibold transition-colors duration-(--dur-micro)"
      >
        <Truck className="size-3.5" aria-hidden />
        Bosh kuryerga berish
      </button>
    );
  }
  if (order.status === "shipping") {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          actions.onAdvance(order);
        }}
        className="mt-0.5 flex h-7.5 items-center justify-center gap-1.5 rounded-lg bg-[var(--order-delivered-mark)] text-meta font-semibold text-white transition-[filter] duration-(--dur-micro) hover:brightness-110"
      >
        <Check className="size-3.5" aria-hidden />
        Yetkazildi
      </button>
    );
  }
  return null;
}
