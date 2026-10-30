"use client";

import { Ban } from "lucide-react";

import { StatusReasonDialog } from "@/features/orders/components/status-reason-dialog";
import { CANCEL_REASONS, REASON_REQUIRING_NOTE } from "@/features/orders/reasons";
import type { LogistOrder } from "@/features/orders/types";
import { formatTime } from "@/lib/format";

/** Urinishlar qatori: "Urinishlar: 3 (10:10 · 14:30 · 18:05) · Kuryer: Jasur K." */
function AttemptsInfo({ order }: { order: LogistOrder }) {
  const attempts = order.deliveryAttempts;
  const times = attempts
    .map((attempt) => (attempt.createdAt ? formatTime(attempt.createdAt) : null))
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flex flex-col gap-1.5">
      {attempts.length > 0 || order.courier ? (
        <p className="text-ink-muted flex flex-wrap gap-x-2.5 text-meta">
          {attempts.length > 0 ? (
            <span>
              Urinishlar: <b className="text-ink">{attempts.length}</b>
              {times ? ` (${times})` : ""}
            </span>
          ) : null}
          {order.courier ? (
            <span>
              · Kuryer: <span data-no-translit>{order.courier.fullName}</span>
            </span>
          ) : null}
        </p>
      ) : null}
      <p className="text-ink-faint text-meta">
        Mijozga push, operatorga xabar + «qayta qo&apos;ng&apos;iroq» dela. Tarixda saqlanadi, keyin
        tiklash mumkin.
      </p>
    </div>
  );
}

/**
 * Atkaz — faqat jarayondan (`shipping`), sabab majburiy (`02` §2.5 xodimlar
 * lug'ati). "Javob bermadi" yonida urinishlar soni ko'rinadi. Kuryerga
 * manzil sukutda qo'shilmaydi; logist chatdan aniqlab `+N` beradi.
 */
export function CancelOrderDialog({
  order,
  onClose,
  onChanged,
}: {
  order: LogistOrder | null;
  onClose: () => void;
  onChanged?: (updated: LogistOrder) => void;
}) {
  return (
    <StatusReasonDialog
      order={order}
      to="cancelled"
      title={(current) => `#${current.orderNumber} ni atkaz qilish`}
      Icon={Ban}
      tone="danger"
      reasons={CANCEL_REASONS}
      reasonLabel={(reason, current) => {
        const attempts = current.deliveryAttempts.length;
        if (reason.value === "no_answer" && attempts > 0) return `${reason.label} (${attempts} urinish)`;
        if (reason.value === REASON_REQUIRING_NOTE) return "Boshqa (izoh majburiy)";
        return reason.label;
      }}
      notePlaceholder="Izoh: kuryer 3 marta bordi, telefon o'chiq…"
      submitLabel="Atkaz qilish"
      info={(current) => <AttemptsInfo order={current} />}
      addressCreditFor="cancelled"
      buildPatch={(value) => ({
        status: "cancelled",
        cancelReason: value.reason,
        cancelNote: value.note || null,
      })}
      onClose={onClose}
      onChanged={onChanged}
    />
  );
}
