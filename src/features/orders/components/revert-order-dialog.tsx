"use client";

import { Undo2 } from "lucide-react";

import { StatusReasonDialog } from "@/features/orders/components/status-reason-dialog";
import { REVERT_REASONS } from "@/features/orders/reasons";
import { paymentView } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import { formatShortDateTime } from "@/lib/format";

/**
 * Yetkazilganni qaytarish oqibatlari. To'lovga tegilmaydi (2026-10-01 §5.2,
 * §9.3 — revert pulni o'zgartirmaydi), faqat statistika qayta hisoblanadi.
 */
function DeliveredWarning({ order }: { order: LogistOrder }) {
  if (order.status !== "delivered") return null;
  const facts = [
    order.courier?.fullName,
    paymentView(order).state === "paid"
      ? "to'lov olingan"
      : paymentView(order).state === "with_courier"
        ? "pul kuryerda"
        : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <p className="border-amber-line bg-amber-soft text-gold rounded-lg border px-3 py-2.5 text-dense leading-relaxed">
      Buyurtma{order.deliveredAt ? ` ${formatShortDateTime(order.deliveredAt)} da` : ""} «Yetkazilgan»
      deb belgilangan{facts ? ` (${facts})` : ""}. Qaytarsangiz to&apos;lov holati o&apos;zgarmaydi
      (olingan pul olingan bo&apos;lib qoladi), statistika qayta hisoblanadi.
    </p>
  );
}

/** Orqaga qaytarish («xato bosildi») — sabab va izoh majburiy (`02` §2.3). */
export function RevertOrderDialog({
  order,
  to,
  onClose,
  onChanged,
}: {
  order: LogistOrder | null;
  to: string;
  onClose: () => void;
  onChanged?: (updated: LogistOrder) => void;
}) {
  return (
    <StatusReasonDialog
      order={order}
      to={to}
      title={(current) => `#${current.orderNumber} ni orqaga qaytarish`}
      Icon={Undo2}
      tone="amber"
      reasons={REVERT_REASONS}
      requireNote
      notePlaceholder="Izoh (majburiy)"
      submitLabel="Qaytarish"
      warning={(current) => <DeliveredWarning order={current} />}
      buildPatch={(value) => ({
        status: to,
        revertReason: value.reason,
        note: value.note || null,
      })}
      onClose={onClose}
      onChanged={onChanged}
    />
  );
}
