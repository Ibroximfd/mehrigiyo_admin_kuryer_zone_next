"use client";

import { MapPin, Truck, X } from "lucide-react";
import Link from "next/link";

import { StatusPill } from "@/components/kit/status-pill";
import { partialStopProgress, stopStatusLabel } from "@/features/stops/types";
import type { DeliveryStop } from "@/features/stops/types";
import { formatShortDateTime, formatSom } from "@/lib/format";
import { ROUTES } from "@/lib/routes";

const STATUS_COLOR: Record<string, string> = {
  open: "var(--brand)",
  delivered: "var(--ok)",
  cancelled: "var(--ink-muted)",
};

/**
 * Bitta to'xtash: manzil, kuryer, ichidagi buyurtmalar va jami summa.
 * Ochiq to'xtashdan buyurtmani chiqarish mumkin (bitta qolsa to'xtash
 * o'zi tarqaladi — server qoidasi).
 */
export function StopCard({
  stop,
  onRemoveOrder,
  removingOrderId,
}: {
  stop: DeliveryStop;
  onRemoveOrder: (stop: DeliveryStop, orderId: string, orderNumber: string) => void;
  removingOrderId: string | null;
}) {
  const open = stop.status === "open";
  const partial = partialStopProgress(stop);

  return (
    <article className="border-line bg-surface flex flex-col gap-2.5 rounded-xl border px-4 py-3.5">
      <header className="flex flex-wrap items-center gap-2">
        <span className="text-ink tabular text-dense font-semibold">Manzil #{stop.id}</span>
        <StatusPill
          size="sm"
          label={stopStatusLabel(stop.status)}
          color={STATUS_COLOR[stop.status] ?? "var(--ink-muted)"}
        />
        <span className="text-ink tabular ml-auto text-dense font-semibold">
          {formatSom(stop.payableTotal)}
        </span>
      </header>

      <p className="text-ink-muted flex items-start gap-1.5 text-meta">
        <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span data-no-translit className="min-w-0">{stop.addressText || "—"}</span>
      </p>
      <p className="text-ink-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-meta">
        {stop.courier?.fullName ? (
          <span data-no-translit className="inline-flex items-center gap-1">
            <Truck className="size-3.5" aria-hidden />
            {stop.courier.fullName}
          </span>
        ) : null}
        <span className="tabular">{stop.date}</span>
        {stop.deliveredAt ? (
          <span className="tabular">yetkazildi {formatShortDateTime(stop.deliveredAt)}</span>
        ) : null}
      </p>

      {partial ? (
        <p role="status" className="bg-amber-soft text-gold rounded-lg px-3 py-2 text-meta leading-relaxed">
          {`Qisman yopildi: ${partial.closed} tasi yetkazildi, ${partial.left} tasi band — kuryer alohida yopadi`}
        </p>
      ) : null}

      <ul className="flex flex-wrap gap-1.5" aria-label="Buyurtmalar">
        {stop.orderIds.map((orderId, index) => {
          const number = stop.orderNumbers[index] ?? orderId.slice(0, 8);
          return (
            <li
              key={orderId}
              className="border-line bg-canvas flex items-center gap-1 rounded-md border py-0.5 pr-0.5 pl-2 text-fine"
            >
              <Link
                href={ROUTES.orderDetail(orderId)}
                data-no-translit
                className="text-ink tabular font-semibold hover:underline"
              >
                {number}
              </Link>
              {open ? (
                <button
                  type="button"
                  disabled={removingOrderId === orderId}
                  onClick={() => onRemoveOrder(stop, orderId, number)}
                  aria-label={`${number} ni manzildan chiqarish`}
                  className="text-ink-faint hover:bg-danger-soft hover:text-danger rounded p-0.5 transition-colors disabled:opacity-50"
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
