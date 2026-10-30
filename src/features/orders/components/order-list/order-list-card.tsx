"use client";

import { ChevronRight, MapPin } from "lucide-react";
import { memo } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { formatDeliveryAddress } from "@/features/orders/address";
import { AddressChangedBadge } from "@/features/orders/components/address-changed-badge";
import { AddressIssueBadge } from "@/features/orders/components/address-issue-badge";
import { CreatorTag } from "@/features/orders/components/kanban/card-parts";
import type { RowActions } from "@/features/orders/components/order-list/order-row-menu";
import { PaymentBadge } from "@/features/orders/components/payment-badge";
import { PhoneList } from "@/features/orders/components/phone-list";
import { StatusTag } from "@/features/orders/components/status-tag";
import { ZoneBadges } from "@/features/orders/components/zoning/zone-parts";
import { deliveryDateText } from "@/features/orders/delivery-labels";
import { deliveryDateTone, orderStatusInfo } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import { groupThousands } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Ro'yxatning mobil (375px) ko'rinishi — jadval o'rniga kartochka: 13 ustun
 * telefonga sig'maydi, gorizontal surish esa eng yomon tajriba.
 */
export const OrderListCard = memo(function OrderListCard({
  order,
  checked,
  actions,
}: {
  order: LogistOrder;
  checked: boolean;
  actions: RowActions;
}) {
  // Viloyat, tuman, mahalla, ko'cha — bitta qator (karta va detal bilan bir xil).
  const address = formatDeliveryAddress(order);
  const overdue = deliveryDateTone(order) === "overdue";

  return (
    <article
      onClick={() => actions.onOpen(order.id)}
      style={{ "--spine": orderStatusInfo(order.status).mark } as React.CSSProperties}
      className={cn(
        "row-virtual spine hover:bg-subtle flex cursor-pointer items-start gap-3 py-3 pr-3 pl-4",
        checked && "bg-brand-soft",
      )}
    >
      <span onClick={(event) => event.stopPropagation()} className="pt-0.5">
        <Checkbox
          checked={checked}
          onCheckedChange={() => actions.onToggle(order.id)}
          aria-label={`${order.orderNumber} ni tanlash`}
        />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Ochish — haqiqiy tugma; ramka tugma emas (ichida katakcha, 📞 bor). */}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              actions.onOpen(order.id);
            }}
            className="text-ink hover:text-brand rounded-sm text-dense font-semibold"
          >
            <span data-no-translit>#{order.orderNumber}</span>
          </button>
          <StatusTag status={order.status} label={order.statusDisplay} />
        </div>
        <p className="text-ink truncate text-dense font-medium" data-no-translit>
          {order.client.fullName || "—"}
        </p>
        <PhoneList phones={order.client.phones} compact className="text-meta" />
        <p className={cn("flex items-center gap-1 truncate text-meta", address ? "text-ink-muted" : "text-danger")}>
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate" data-no-translit={address ? "" : undefined}>
            {address || "⚠ Manzil aniqlanmagan"}
          </span>
        </p>
        <ZoneBadges order={order} />
        <div className="flex flex-wrap items-center gap-1.5">
          <AddressIssueBadge order={order} />
          <AddressChangedBadge order={order} />
          <CreatorTag creator={order.createdBy} />
          {order.deliveryDate ? (
            <span className={cn("tabular text-fine font-semibold", overdue ? "text-danger" : "text-ink-muted")}>
              {deliveryDateText(order, { short: true })}
            </span>
          ) : null}
          <span
            className={cn("text-fine", order.courier ? "text-ink-muted" : "text-danger")}
            data-no-translit={order.courier ? "" : undefined}
          >
            {order.courier?.fullName ?? "kuryersiz"}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-ink tabular text-body font-bold whitespace-nowrap">
          {groupThousands(order.payableAmount)}
        </span>
        <PaymentBadge order={order} compact />
        <ChevronRight className="text-ink-faint size-4" aria-hidden />
      </div>
    </article>
  );
});
