"use client";

import {
  Banknote,
  CircleAlert,
  CircleCheck,
  CircleQuestionMark,
  CircleSlash,
  Undo2,
  type LucideIcon,
} from "lucide-react";

import { paymentMethodLabel, paymentView } from "@/features/orders/types";
import type { PaymentFacts, PaymentState, PaymentView } from "@/features/orders/types";
import { cn } from "@/lib/utils";

/**
 * To'lov nishonchasi: **turi va holati birga**.
 *
 * Ilgari ekranda faqat tur ("Karta") turardi va logist pul tushdimi-yo'qmi
 * bilolmasdi — buyurtma statusi esa `paid` bo'g'inidan o'tgani uchun
 * "To'langan" deb ko'rinardi. Endi holat alohida maydonlardan olinadi
 * (`features/orders/types.ts` → `paymentView`) va tur bilan yonma-yon
 * chiqadi: "Karta · To'lanmagan".
 */
const TONE: Record<PaymentView["tone"], string> = {
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  gold: "bg-gold-soft text-gold",
  muted: "bg-subtle text-ink-muted",
};

const ICON: Record<PaymentState, LucideIcon> = {
  paid: CircleCheck,
  partial: CircleAlert,
  unpaid: CircleAlert,
  cod: Banknote,
  with_courier: Banknote,
  // Qaytarilgan va bekor qilingan to'lov — ogohlantirish emas, tugagan ish.
  refunded: Undo2,
  // Bekor + pul bizda — bajarilishi kerak bo'lgan qaytarish (§8.3).
  refund_due: CircleAlert,
  cancelled: CircleSlash,
  unknown: CircleQuestionMark,
};

export function PaymentBadge({
  order,
  compact = false,
  className,
}: {
  order: PaymentFacts;
  /** Doska kartochkasi va ro'yxat qatori uchun — faqat holat, tursiz. */
  compact?: boolean;
  className?: string;
}) {
  const view = paymentView(order);
  const Icon = ICON[view.state];
  const method = paymentMethodLabel(order.paymentMethod);
  const text = method ? `${method} · ${view.label}` : view.label;

  return (
    <span
      title={text}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-semibold",
        compact ? "text-micro" : "text-fine",
        TONE[view.tone],
        className,
      )}
    >
      <Icon className={compact ? "size-3" : "size-3.5"} />
      {compact ? view.label : text}
    </span>
  );
}
