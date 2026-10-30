import { Clock, MapPinOff, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { CARD_TAG } from "@/features/orders/components/kanban/card-parts";
import { addressIssueBadge } from "@/features/orders/geocode";
import type { AddressIssueKind, GeocodeFacts } from "@/features/orders/geocode";
import { cn } from "@/lib/utils";

const VIEW: Record<AddressIssueKind, { Icon: LucideIcon; tone: string }> = {
  imprecise: { Icon: TriangleAlert, tone: "bg-warn-soft text-warn" },
  outside_district: { Icon: MapPinOff, tone: "bg-danger-soft text-danger" },
  // Kutish — neytral: xato emas, server fonda ishlayapti.
  pending: { Icon: Clock, tone: "bg-subtle text-ink-muted" },
};

/**
 * Geokod belgisi (2026-10-16 B4): "Manzil taxminiy" · "Tumandan
 * tashqarida" · "Geokod kutilmoqda". Tooltip — nima bo'lgani va nima
 * qilish. Belgi yo'q bo'lsa hech narsa chizilmaydi.
 */
export function AddressIssueBadge({
  order,
  className,
}: {
  order: GeocodeFacts;
  className?: string;
}) {
  const badge = addressIssueBadge(order);
  if (!badge) return null;
  const { Icon, tone } = VIEW[badge.kind];
  return (
    <span className={cn(CARD_TAG, tone, "max-w-full", className)} title={badge.hint}>
      <Icon className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{badge.label}</span>
    </span>
  );
}
