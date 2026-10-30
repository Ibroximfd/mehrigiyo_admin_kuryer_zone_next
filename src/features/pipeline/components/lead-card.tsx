"use client";

import {
  CalendarDays,
  Clock3,
  Layers,
  MapPin,
  MessageSquareDiff,
  Package,
  Phone,
  Truck,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { memo } from "react";

import { PaymentBadge } from "@/features/orders/components/payment-badge";
import { DELIVERY_WINDOWS, orderStatusInfo } from "@/features/orders/types";
import {
  cardSignals,
  columnSince,
  formatDwell,
  handoverLeft,
  isDeliveryOverdue,
  isStaleDwell,
  needsCourier,
  openOrders,
  openTotals,
  paymentFactsOf,
} from "@/features/pipeline/card-model";
import type { PipelineLead, PipelineOrder } from "@/features/pipeline/types";
import { formatDayMonth, formatPhone, formatSom, toIsoDay } from "@/lib/format";
import { cn } from "@/lib/utils";

const CHIP =
  "inline-flex h-5 max-w-full shrink-0 items-center gap-1 rounded-md px-1.5 text-fine font-semibold whitespace-nowrap";

/** Kartada to'liq ochiladigan buyurtmalar soni; qolgani "+N ta buyurtma". */
const DETAILED_ORDERS = 2;

/**
 * Lid kartasi — Dostavka va Bazada bir xil. O'qish tartibi (logist bir
 * qarashda): **mijoz → summa/to'lov → kuryer/yetkazish → signallar**.
 *
 * Har buyurtma o'z holati, summasi, to'lovi, kuryeri va yetkazish kuni
 * bilan (`LOGIST_04` §3.2 B): ikki zakaz ikki holatda bo'lsa ikkalasi
 * ko'rinadi. Server bermagan maydon chizilmaydi — bo'sh joy qolmaydi;
 * uzun matn kesiladi, karta kengligi buzilmaydi.
 *
 * `memo` + barqaror `onOpen`: real vaqtda bitta karta o'zgarsa qolganlari
 * qayta chizilmaydi. `now` — doska darajasidagi bitta soat (daqiqada bir).
 */
export const LeadCard = memo(function LeadCard({
  lead,
  now,
  onOpen,
  awaitingBase = false,
}: {
  lead: PipelineLead;
  now: Date;
  onOpen: (lead: PipelineLead) => void;
  /** «Yetkazildi» ustunida — vaqt belgisi o'rnida Bazagacha qolgani. */
  awaitingBase?: boolean;
}) {
  const open = openOrders(lead);
  // Ochiq buyurtmalar birinchi (Dostavka); Bazada — eng yangi yopiqlar.
  const shown = (open.length > 0 ? open : lead.orders).slice(0, DETAILED_ORDERS);
  const hidden = (open.length > 0 ? open.length : lead.orders.length) - shown.length;
  const totals = openTotals(lead);
  const signals = cardSignals(lead);
  const since = columnSince(lead);
  const toBase = awaitingBase ? handoverLeft(lead.handoverAt, now) : null;
  const todayKey = toIsoDay(now);

  return (
    <button
      type="button"
      onClick={() => onOpen(lead)}
      className={cn(
        "border-line bg-surface hover:border-line-strong focus-visible:ring-brand/40 flex w-full min-w-0 flex-col gap-2 rounded-xl border px-3 py-2.5 text-left",
        "shadow-card transition-[border-color,box-shadow,transform] duration-(--dur-micro) ease-out hover:-translate-y-px focus-visible:ring-2 focus-visible:outline-none",
        signals.changeRequest && "border-amber-line",
      )}
    >
      {/* ── Mijoz ─────────────────────────────────────────────────────── */}
      <span className="flex min-w-0 items-start gap-2">
        <span data-no-translit className="text-ink line-clamp-2 min-w-0 flex-1 text-dense font-semibold break-words">
          {lead.fullName || formatPhone(lead.phone) || `#${lead.id}`}
        </span>
        {toBase ? (
          <span title="Bazaga o'tishiga qolgan vaqt" className={cn(CHIP, "tabular bg-ok-soft text-ok")}>
            <Clock3 className="size-3" aria-hidden />
            {toBase}
          </span>
        ) : since ? (
          <span
            title="Shu ustunda turgan vaqt"
            className={cn(
              CHIP,
              "tabular",
              isStaleDwell(since, now) ? "bg-warn-soft text-warn" : "bg-subtle text-ink-muted",
            )}
          >
            <Clock3 className="size-3" aria-hidden />
            {formatDwell(since, now)}
          </span>
        ) : null}
      </span>

      <span className="text-ink-muted flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-meta">
        {lead.phone ? (
          <span className="tabular inline-flex items-center gap-1">
            <Phone className="size-3" aria-hidden />
            {formatPhone(lead.phone)}
          </span>
        ) : null}
        {lead.assignedTo?.fullName ? (
          <span data-no-translit className="inline-flex min-w-0 items-center gap-1">
            <UserRound className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{lead.assignedTo.fullName}</span>
          </span>
        ) : null}
      </span>

      {/* ── Buyurtmalar: summa/to'lov → kuryer/yetkazish ─────────────── */}
      {shown.length > 0 ? (
        <span className="flex flex-col gap-1.5">
          {shown.map((order) => (
            <OrderBlock key={order.id} order={order} todayKey={todayKey} />
          ))}
        </span>
      ) : null}

      {/* ── Signallar ─────────────────────────────────────────────────── */}
      {signals.changeRequest || signals.stopGroupSize || hidden > 0 ? (
        <span className="flex flex-wrap gap-1.5">
          {signals.changeRequest ? (
            <span className={cn(CHIP, "bg-amber-soft text-gold ring-amber-line animate-pulse ring-1")}>
              <MessageSquareDiff className="size-3" aria-hidden />
              O&apos;zgarish kutilmoqda
            </span>
          ) : null}
          {signals.stopGroupSize ? (
            <span className={cn(CHIP, "bg-info-soft text-info tabular")}>
              <Layers className="size-3" aria-hidden />
              {`1 manzil · ${signals.stopGroupSize} zakaz`}
            </span>
          ) : null}
          {hidden > 0 ? (
            <span className={cn(CHIP, "bg-subtle text-ink-muted tabular")}>
              {totals.count > 1
                ? `+${hidden} zakaz · jami ${formatSom(totals.payable)}`
                : `+${hidden} ta buyurtma`}
            </span>
          ) : null}
        </span>
      ) : null}
    </button>
  );
});

function OrderBlock({ order, todayKey }: { order: PipelineOrder; todayKey: string }) {
  const info = orderStatusInfo(order.status);
  const overdue = isDeliveryOverdue(order, todayKey);
  const window = order.deliveryWindow
    ? DELIVERY_WINDOWS.find((item) => item.value === order.deliveryWindow)?.label
    : null;
  const deliveryText = [
    order.deliveryDate ? formatDayMonth(new Date(`${order.deliveryDate}T00:00:00`)) : null,
    window,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <span
      style={{ "--accent": info.color } as React.CSSProperties}
      className="bg-canvas flex min-w-0 flex-col gap-1 rounded-lg border-l-2 border-[var(--accent)] px-2 py-1.5"
    >
      {/*
        Holat · summa — summa kartaning asosiy raqami: hech qachon
        kesilmaydi va o'ralmaydi. Uzun raqam ("ORD-2026…") alohida qatorda
        qisqaradi (to'liq — `title` da), summani chetga surib chiqarmaydi.
      */}
      <span className="flex min-w-0 items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-fine font-semibold text-[var(--accent)]">{info.label}</span>
        <span className="text-ink tabular shrink-0 text-dense font-bold whitespace-nowrap">
          {formatSom(order.payableAmount)}
        </span>
      </span>
      <span className="text-ink-muted flex min-w-0 items-center gap-1.5 text-fine">
        <span data-no-translit title={order.orderNumber} className="tabular min-w-0 truncate font-medium">
          {order.orderNumber}
        </span>
        {order.createdAt ? (
          <span className="text-ink-faint tabular shrink-0">{`· ${formatDayMonth(order.createdAt)}`}</span>
        ) : null}
      </span>

      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        <PaymentBadge order={paymentFactsOf(order)} compact className="min-w-0 shrink" />
        {order.itemsCount > 0 ? (
          <span className="text-ink-muted tabular inline-flex items-center gap-1 text-fine">
            <Package className="size-3" aria-hidden />
            {`${order.itemsCount} ta mahsulot`}
          </span>
        ) : null}
      </span>

      {/* Kuryer: ism + bosqich; yo'q bo'lsa ko'zga tashlanadigan belgi */}
      {order.courier ? (
        <span className="text-ink-muted flex min-w-0 items-center gap-1 text-fine">
          <Truck className="size-3 shrink-0" aria-hidden />
          <span data-no-translit className="text-ink min-w-0 truncate font-medium">
            {order.courier.fullName || "Kuryer"}
          </span>
          {order.courier.stageLabel ? (
            <span className="bg-brand-soft text-brand shrink-0 rounded px-1 font-semibold">
              {order.courier.stageLabel}
            </span>
          ) : null}
        </span>
      ) : needsCourier(order) ? (
        <span className={cn(CHIP, "bg-danger-soft text-danger w-fit")}>
          <TriangleAlert className="size-3" aria-hidden />
          Kuryer yo&apos;q
        </span>
      ) : null}

      {/* Yetkazish: sana + oyna, qisqa manzil; kechiksa ogohlantirish */}
      {deliveryText || order.addressShort ? (
        <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5 text-fine">
          {deliveryText ? (
            <span
              className={cn(
                "tabular inline-flex shrink-0 items-center gap-1",
                overdue ? "text-danger font-semibold" : "text-ink-muted",
              )}
            >
              <CalendarDays className="size-3" aria-hidden />
              {`Yetkazish: ${deliveryText}`}
              {overdue ? " · kechikdi" : ""}
            </span>
          ) : null}
          {order.addressShort ? (
            <span className="text-ink-muted inline-flex min-w-0 items-center gap-1">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span data-no-translit className="truncate">
                {order.addressShort}
              </span>
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
