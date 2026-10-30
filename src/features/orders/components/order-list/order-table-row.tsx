"use client";

import { Smartphone, SmartphoneNfc } from "lucide-react";
import { memo } from "react";

import { CallButton } from "@/components/kit/call-button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDeliveryAddress } from "@/features/orders/address";
import { AddressChangedBadge } from "@/features/orders/components/address-changed-badge";
import { AddressIssueBadge } from "@/features/orders/components/address-issue-badge";
import { ConfirmationChip } from "@/features/orders/components/confirmation-chip";
import { CARD_TAG, creatorTagText } from "@/features/orders/components/kanban/card-parts";
import { OrderRowMenu } from "@/features/orders/components/order-list/order-row-menu";
import type { RowActions } from "@/features/orders/components/order-list/order-row-menu";
import { PaymentBadge } from "@/features/orders/components/payment-badge";
import { StatusTag } from "@/features/orders/components/status-tag";
import { appPresence, appUnavailableTooltip } from "@/features/orders/confirmation";
import { deliveryDateText } from "@/features/orders/delivery-labels";
import { deliveryDateTone, orderStatusInfo } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import { CourierMessageBadge } from "@/features/orders/components/kanban/courier-message-badge";
import { OrderChatBadge } from "@/features/orders/components/kanban/order-chat-badge";
import { formatDayMonth, formatPhone, groupThousands } from "@/lib/format";
import { cn } from "@/lib/utils";

const CELL = "border-line/70 border-b px-2.5 py-2 align-middle whitespace-nowrap";

/**
 * Ro'yxat qatori (dizayn `Logist_List`) — 13 ustun. `memo`: bitta belgilash
 * yuzlab qatorni qayta chizmasin (callbacklar yuqorida barqaror).
 */
export const OrderTableRow = memo(function OrderTableRow({
  order,
  checked,
  actions,
}: {
  order: LogistOrder;
  checked: boolean;
  actions: RowActions;
}) {
  const [phone, ...rest] = order.client.phones;
  const overdue = deliveryDateTone(order) === "overdue";
  // Viloyat, tuman, mahalla, ko'cha — karta va detal bilan bir xil; pastda zona.
  const address = formatDeliveryAddress(order);
  const zone = order.zoning.zoneName;

  return (
    <tr
      onClick={() => actions.onOpen(order.id)}
      className={cn(
        "row-virtual hover:bg-subtle cursor-pointer text-dense transition-colors duration-(--dur-micro)",
        checked && "bg-brand-soft",
      )}
    >
      <td
        style={{ "--spine": orderStatusInfo(order.status).mark } as React.CSSProperties}
        className={cn(CELL, "spine w-9 pl-3.5")}
        onClick={(event) => event.stopPropagation()}
      >
        <Checkbox
          checked={checked}
          onCheckedChange={() => actions.onToggle(order.id)}
          aria-label={`${order.orderNumber} ni tanlash`}
        />
      </td>
      <td className={CELL}>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              actions.onOpen(order.id);
            }}
            className="text-link hover:text-brand font-semibold"
          >
            <span data-no-translit>#{order.orderNumber}</span>
          </button>
          <OrderChatBadge orderId={order.id} onOpen={actions.onDiscuss} />
          <CourierMessageBadge orderId={order.id} onOpen={actions.onOpen} />
        </span>
        <span className="text-ink-faint tabular block text-fine">
          {order.createdAt ? formatDayMonth(order.createdAt) : "—"}
        </span>
      </td>
      <td className={CELL}>
        <span className="flex flex-col items-start gap-0.5">
          <StatusTag status={order.status} label={order.statusDisplay} />
          {order.status !== "pending" ? (
            <ConfirmationChip confirmation={order.confirmation} className="h-4.5 max-w-40" />
          ) : null}
        </span>
      </td>
      <td className={CELL}>
        <span className="flex items-center gap-1">
          <b className="text-ink max-w-40 truncate font-semibold" data-no-translit>
            {order.client.fullName || "—"}
          </b>
          <AppPresenceIcon order={order} />
        </span>
      </td>
      <td className={CELL} onClick={(event) => event.stopPropagation()}>
        <span className="flex items-center gap-1">
          <span className="tabular text-meta">{phone ? formatPhone(phone) : "—"}</span>
          {rest.length > 0 ? (
            <span
              title={rest.map(formatPhone).join(", ")}
              className={cn(CARD_TAG, "bg-subtle text-ink-muted h-4.5 px-1")}
            >
              +{rest.length}
            </span>
          ) : null}
          {phone ? <CallButton phone={phone} className="bg-surface-3 text-brand size-6 p-0" /> : null}
        </span>
      </td>
      <td className={cn(CELL, "tabular text-right font-semibold whitespace-nowrap")}>
        {groupThousands(order.payableAmount)}
      </td>
      <td className={CELL}>
        <PaymentBadge order={order} compact />
      </td>
      <td className={CELL}>
        {order.createdBy ? (
          <span className={cn(CARD_TAG, "bg-subtle text-ink-muted")}>{creatorTagText(order.createdBy)}</span>
        ) : (
          "—"
        )}
      </td>
      <td className={cn(CELL, "tabular font-semibold", overdue ? "text-danger" : "text-ink")}>
        {deliveryDateText(order, { short: true }) || "—"}
      </td>
      <td
        className={cn(CELL, "max-w-56 truncate")}
        title={address ?? undefined}
        data-no-translit={address ? "" : undefined}
      >
        {address || <span className="text-danger">⚠ manzilsiz</span>}
        {zone ? (
          <span className="text-ink-faint block truncate text-fine" data-no-translit>
            {zone}
          </span>
        ) : null}
        <AddressIssueBadge order={order} className="mt-0.5 h-4.5" />
        <AddressChangedBadge order={order} className="mt-0.5 h-4.5" />
      </td>
      <td className={cn(CELL, order.courier ? "text-ink" : "text-danger")}>
        <span className="flex items-center gap-1">
          <span data-no-translit={order.courier ? "" : undefined}>
            {order.courier?.fullName ?? "kuryersiz"}
          </span>
          {order.courier && order.zoning.zoneMatch === false ? (
            <span className={cn(CARD_TAG, "bg-danger-soft text-danger h-4.5")} title="Kuryer buyurtma zonasidan emas">
              Zona mos emas
            </span>
          ) : null}
          {order.courier && order.zoning.autoAssigned ? (
            <span className={cn(CARD_TAG, "bg-info-soft text-info h-4.5")} title="Avto taqsimlash biriktirgan">
              Avto
            </span>
          ) : null}
        </span>
      </td>
      <td className={cn(CELL, "pr-3.5")} onClick={(event) => event.stopPropagation()}>
        <OrderRowMenu order={order} actions={actions} />
      </td>
    </tr>
  );
});

/** Mijoz ustunidagi ilova belgisi: bor — yashil, o'rnatib bo'lmaydi — sariq. */
function AppPresenceIcon({ order }: { order: LogistOrder }) {
  const presence = appPresence(order.client);
  if (presence === "has") {
    return <SmartphoneNfc className="text-ok size-3.5 shrink-0" aria-label="Ilova bor" />;
  }
  if (presence === "unavailable") {
    const tooltip = appUnavailableTooltip(order.client.appUnavailable);
    return (
      <span title={tooltip} className="text-gold inline-flex shrink-0">
        <Smartphone className="size-3.5" aria-label="Ilovani o'rnatish imkoni bo'lmadi" />
      </span>
    );
  }
  return null;
}
