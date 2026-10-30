import { Star } from "lucide-react";

import { hasPointsDiscount } from "@/features/orders/points";
import type { OrderAmountFacts } from "@/features/orders/points";
import { formatSom, groupThousands } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Ball chegirmasining ko'rinishi (`OPERATOR_BALL_FRONTEND.md`).
 *
 * Qoidalar `features/orders/points.ts` da; bu yerda faqat chizish. Ball
 * ishlatilmagan buyurtmada ko'rinish avvalgidek qoladi, shuning uchun bu
 * komponentlarni eski qatorlarga qo'yish xavfsiz.
 */

/** Ro'yxatda ham ko'rinadigan belgi: operator kartochkani ochmay bilsin. */
export function PointsBadge({
  order,
  compact = false,
  className,
}: {
  order: Pick<OrderAmountFacts, "pointsUsed" | "pointsDiscount">;
  /** Doska kartochkasi va ro'yxat qatori uchun — mayda. */
  compact?: boolean;
  className?: string;
}) {
  if (!hasPointsDiscount(order)) return null;

  return (
    <span
      title={`Mijoz ${groupThousands(order.pointsUsed)} ball ishlatgan — ${formatSom(
        order.pointsDiscount,
      )} chegirma`}
      className={cn(
        "bg-gold-soft text-gold flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-semibold",
        compact ? "text-micro" : "text-fine",
        className,
      )}
    >
      <Star className={compact ? "size-3" : "size-3.5"} />
      {groupThousands(order.pointsUsed)}
      {compact ? null : " ball"}
    </span>
  );
}

/**
 * Ro'yxat va kartochka uchun summa: ball bo'lsa mol summasi chiziladi va
 * yoniga to'lanadigani chiqadi, bo'lmasa — bitta raqam, avvalgidek.
 *
 * Asosiy raqam chaqiruvchining o'lchami va rangini meros qilib oladi, ya'ni
 * qatorlarning tipografiyasi o'zgarmaydi.
 */
export function OrderAmount({
  order,
  className,
}: {
  order: OrderAmountFacts;
  className?: string;
}) {
  if (!hasPointsDiscount(order)) {
    return <span className={className}>{formatSom(order.totalAmount)}</span>;
  }

  return (
    <span
      title={`Mahsulotlar ${formatSom(order.totalAmount)} · ${groupThousands(
        order.pointsUsed,
      )} ball −${formatSom(order.pointsDiscount)}`}
      className={cn("inline-flex items-baseline gap-1", className)}
    >
      {/* Belgi ro'yxatda ham ko'rinadi: kartochkani ochmay ball borligi bilinsin. */}
      <Star className="text-gold size-3.5 shrink-0 self-center" />
      <s className="text-ink-faint text-fine font-normal">
        {formatSom(order.totalAmount)}
      </s>
      <span>{formatSom(order.payableAmount)}</span>
    </span>
  );
}

/**
 * Buyurtma kartochkasidagi to'liq hisob: mahsulotlar → ball → to'lanadi.
 *
 * Ball ishlatilmagan buyurtmada umuman chizilmaydi (`null`) — o'sha yerda
 * bitta summa yetarli.
 */
export function OrderAmountBreakdown({
  order,
  className,
}: {
  order: OrderAmountFacts;
  className?: string;
}) {
  if (!hasPointsDiscount(order)) return null;

  return (
    <dl className={cn("text-meta space-y-1", className)}>
      <div className="text-ink-muted flex items-baseline justify-between gap-2">
        <dt>Mahsulotlar</dt>
        <dd className="tabular">{formatSom(order.totalAmount)}</dd>
      </div>
      <div className="text-gold flex items-baseline justify-between gap-2">
        <dt className="flex items-center gap-1">
          <Star className="size-3.5" />
          {groupThousands(order.pointsUsed)} ball
        </dt>
        <dd className="tabular">−{formatSom(order.pointsDiscount)}</dd>
      </div>
    </dl>
  );
}
