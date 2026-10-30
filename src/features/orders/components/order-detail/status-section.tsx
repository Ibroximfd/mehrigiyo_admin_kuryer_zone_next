"use client";

import { AlarmClock, ArrowRightLeft, BadgeCheck, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OrderAmountBreakdown } from "@/features/orders/components/order-amount";
import { cashbackView } from "@/features/orders/cashback";
import { AddressCreditRow } from "@/features/orders/components/order-detail/address-credit-row";
import { CashbackValue } from "@/features/orders/components/order-detail/cashback-value";
import { DetailRow, DetailSection, EMPTY_VALUE } from "@/features/orders/components/order-detail/section";
import { StatusActions } from "@/features/orders/components/order-detail/status-actions";
import { PendingReasonChip } from "@/features/orders/components/order-meta-chips";
import { PaymentBadge } from "@/features/orders/components/payment-badge";
import { confirmationSummary, confirmationView } from "@/features/orders/confirmation";
import { deliveryDateText } from "@/features/orders/delivery-labels";
import { canReportAttempt, canTransferOrder, statusBlockedReason } from "@/features/orders/permissions";
import { cancelReasonLabel } from "@/features/orders/reasons";
import {
  deliveryDateTone,
  paymentMethodLabel,
  paymentReference,
  paymentView,
} from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import { formatDate, formatDateTime, groupThousands } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Holat: katta summa, to'lov, keyingi qadam va holat jadvali (tasdiq, to'lov,
 * sana, kuryer). Transfer qulfi va atkaz sababi shu blokda aytiladi.
 */
export function StatusSection({
  order,
  locked,
  pending,
  onSelectStatus,
  onReportAttempt,
  onReminder,
  onTransfer,
  onPatched,
}: {
  order: LogistOrder;
  locked: boolean;
  pending: boolean;
  onSelectStatus: (status: string) => void;
  onReportAttempt: () => void;
  onReminder: () => void;
  onTransfer: () => void;
  onPatched: (updated: LogistOrder) => void;
}) {
  const blocked = statusBlockedReason(order);
  const cashback = cashbackView(order.cashback, formatDate);

  return (
    <DetailSection title="Holat">
      {locked ? <TransferNotice order={order} /> : null}

      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <span className="text-ink tabular text-display font-bold whitespace-nowrap">
          {groupThousands(order.payableAmount)}
          <span className="text-ink-muted ml-1.5 text-lg2 font-medium">so&apos;m</span>
        </span>
        <PaymentBadge order={order} className="h-6.5" />
        <div className="w-full sm:ml-auto sm:w-auto">
          {!locked ? (
            <StatusActions order={order} pending={pending} onSelect={onSelectStatus} />
          ) : null}
        </div>
      </div>

      <OrderAmountBreakdown order={order} />
      {blocked && !locked ? <p className="text-ink-faint text-meta">{blocked}</p> : null}
      <CancelNotice order={order} />

      <div className="border-line rounded-lg border px-3.5 py-1">
        <DetailRow label="Tasdiqlash">
          <ConfirmationValue order={order} />
        </DetailRow>
        <DetailRow label="To'lov holati">
          <PaymentStateValue order={order} />
        </DetailRow>
        <DetailRow label="Yetkazish sanasi">
          {order.deliveryDate ? (
            <span
              className={cn(
                "tabular font-semibold",
                deliveryDateTone(order) === "overdue" && "text-danger",
              )}
            >
              {deliveryDateText(order, { withYear: true })}
            </span>
          ) : (
            EMPTY_VALUE
          )}
        </DetailRow>
        <DetailRow label="Kuryer">
          {order.courier ? (
            <span className="font-semibold">{order.courier.fullName}</span>
          ) : (
            <span className="text-danger font-semibold">Biriktirilmagan</span>
          )}
        </DetailRow>
        <AddressCreditRow order={order} locked={locked} onChanged={onPatched} />
        {cashback ? (
          <DetailRow label="Keshbek (ball)">
            <CashbackValue view={cashback} />
          </DetailRow>
        ) : null}
      </div>

      {!locked ? (
        <div className="flex flex-wrap gap-2">
          {canReportAttempt(order.status) ? (
            <Button size="sm" variant="outline" className="text-warn" onClick={onReportAttempt}>
              <TriangleAlert />
              Yetkazib bo&apos;lmadi
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={onReminder}>
            <AlarmClock />
            Eslatma
          </Button>
          {canTransferOrder(order) ? (
            <Button size="sm" variant="outline" onClick={onTransfer}>
              <ArrowRightLeft />
              Boshqa filialga
            </Button>
          ) : null}
        </div>
      ) : null}
    </DetailSection>
  );
}

/** "Operator Dilnoza tasdiqladi · telefon orqali · Ilovani o'rnatish imkoni bo'lmadi · 01.10 14:22" (§4). */
function ConfirmationValue({ order }: { order: LogistOrder }) {
  if (order.status === "pending" && order.pendingReason) {
    return <PendingReasonChip reason={order.pendingReason} />;
  }
  const view = confirmationView(order.confirmation);
  if (!view) return EMPTY_VALUE;
  const method = paymentMethodLabel(order.paymentMethod);
  const summary = [confirmationSummary(view), method ? `${method.toLowerCase()} tanlandi` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <span className="flex flex-col items-end gap-0.5 text-right">
      <span className={cn("inline-flex items-center gap-1", view.isRealClient && "text-ok font-semibold")}>
        {view.isRealClient ? <BadgeCheck className="size-3.5 shrink-0" aria-hidden /> : null}
        {summary}
      </span>
      {view.note ? (
        <span className="text-ink-faint text-fine" data-no-translit>
          {view.note}
        </span>
      ) : null}
    </span>
  );
}

function PaymentStateValue({ order }: { order: LogistOrder }) {
  const view = paymentView(order);
  const reference = paymentReference(order);
  return (
    <span className="flex flex-col items-end gap-0.5">
      <PaymentBadge order={order} compact />
      {reference ? <span className="text-ink-faint text-fine">{reference}</span> : null}
      {order.paidAt ? (
        <span className="text-ink-faint text-fine">To&apos;landi: {formatDateTime(order.paidAt)}</span>
      ) : null}
      {view.state === "unknown" ? (
        <span className="text-ink-faint text-fine">kassadan tekshiring</span>
      ) : null}
    </span>
  );
}

function CancelNotice({ order }: { order: LogistOrder }) {
  const cancel = order.cancel;
  const reason = cancelReasonLabel(cancel?.reason);
  if (order.status !== "cancelled" || (!reason && !cancel?.note)) return null;
  return (
    <p className="bg-danger-soft text-danger rounded-lg px-3 py-2 text-meta leading-relaxed">
      <span className="font-semibold">Atkaz{reason ? `: ${reason}` : ""}</span>
      {cancel?.note ? (
        <>
          {" — "}
          <span data-no-translit>«{cancel.note}»</span>
        </>
      ) : null}
      {cancel?.by || cancel?.at ? (
        <span className="block opacity-80" data-no-translit>
          {[cancel.by, cancel.at ? formatDateTime(cancel.at) : null].filter(Boolean).join(" · ")}
        </span>
      ) : null}
    </p>
  );
}

function TransferNotice({ order }: { order: LogistOrder }) {
  const target = order.transfer?.toFilial?.name;
  return (
    <p className="bg-warn-soft text-warn flex items-start gap-2 rounded-lg px-3 py-2.5 text-meta leading-relaxed">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
      <span>
        {target
          ? `«${target}» filialiga o'tkazilmoqda — javob kelguncha amallar qulflangan.`
          : "Buyurtma boshqa filialga o'tkazilmoqda — javob kelguncha amallar qulflangan."}
        {order.transfer?.reason ? ` Sabab: ${order.transfer.reason}` : ""}
      </span>
    </p>
  );
}
