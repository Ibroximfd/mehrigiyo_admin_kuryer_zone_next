"use client";

import { cn } from "@/lib/utils";

import { useUrgentOrders } from "../use-urgent-orders";

/**
 * Menyudagi «Zakazlar» yonida faol shoshilinch zakazlar soni (hujjat 123 §4).
 * Tasdiqlanmagani bo'lsa qizil, hammasi qabul qilingan bo'lsa neytral.
 * `rail` — to'q yon panel; `bar` — telefonning pastki paneli (och fon).
 */
export function UrgentNavBadge({ surface, className }: { surface: "rail" | "bar"; className?: string }) {
  const { counts } = useUrgentOrders();
  if (counts.total === 0) return null;
  const alarming = counts.unacked > 0;
  return (
    <span
      aria-label={`Shoshilinch zakazlar: ${counts.total}`}
      className={cn(
        "tabular inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-fine font-bold",
        surface === "rail"
          ? alarming
            ? "bg-rail-danger text-rail"
            : "bg-rail-hover text-rail-ink"
          : alarming
            ? "bg-danger text-surface"
            : "bg-subtle text-ink-muted",
        className,
      )}
    >
      {counts.total}
    </span>
  );
}
