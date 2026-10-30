"use client";

import { Check } from "lucide-react";

import { QUICK_FILTERS } from "@/features/orders/client-filters";
import type { QuickCounts } from "@/features/orders/client-filters";
import { cn } from "@/lib/utils";

const TONE: Record<(typeof QUICK_FILTERS)[number]["tone"], string> = {
  accent: "border-amber bg-amber text-amber-ink",
  chat: "border-brand/30 bg-brand-soft text-brand",
  amber: "border-amber-line bg-amber-soft text-gold",
  danger: "border-danger/30 bg-danger-soft text-danger",
  plain:
    "border-line bg-surface text-ink-muted hover:text-ink hover:border-line-strong",
};

/**
 * Tezkor chiplar (Yangi · Yangi xabar · Kuryersiz · Bugun yetkaziladi · Kechikkan ·
 * Onlayn to'langan). "Yangi" — hali hech kim olmagan buyurtmalar. Rangli chip — "diqqat" signali doim rangli, tanlangani
 * esa indigo ramka bilan ajraladi. Server chiplari (kuryersiz, kechikkan…)
 * soni faqat yoqilganda chiqadi — javobdagi jami (`quickFilterCounts`).
 */
export function QuickChips({
  value,
  counts,
  onChange,
  className,
}: {
  value: string | null;
  counts: QuickCounts;
  onChange: (next: string | null) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Tezkor filtrlar"
      className={cn("flex items-center gap-2", className)}
    >
      {QUICK_FILTERS.map((chip) => {
        const active = value === chip.value;
        return (
          <button
            key={chip.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : chip.value)}
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-meta font-medium whitespace-nowrap",
              "transition-[border-color,background-color,color,box-shadow] duration-(--dur-micro)",
              // Tanlangani adashtirmaydigan: to'liq brend fon + ✓. Rangli
              // ohang faqat tanlanmagan chipda — "diqqat" signali.
              active
                ? "border-brand bg-brand text-white shadow-sm"
                : TONE[chip.tone],
            )}
          >
            {active ? (
              <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
            ) : null}
            {chip.label}
            {counts[chip.value] !== null ? (
              <span
                className={cn(
                  "tabular",
                  active
                    ? "font-bold"
                    : chip.tone === "plain"
                      ? "text-ink-faint"
                      : "",
                )}
              >
                {counts[chip.value]}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
