"use client";

import { visibleLiveStatuses } from "@/features/couriers/live-map-view";
import type { LiveCounters, LiveStatus } from "@/features/couriers/live-map-view";
import { cn } from "@/lib/utils";

const LABEL: Record<LiveStatus, string> = {
  shift: "Smenada",
  moving: "Harakatda",
  lost: "Aloqa yo'q",
  offshift: "Smenadan tashqari",
};

const DOT: Record<LiveStatus, string> = {
  shift: "bg-brand",
  moving: "bg-ok",
  lost: "bg-ink-faint",
  offshift: "bg-line-strong",
};

/**
 * "Smenada 12 · Harakatda 7 · Aloqa yo'q 2" (+ "Smenadan tashqari 3",
 * agar ular ham so'ralgan bo'lsa) — har chip filtr: bosilsa
 * xarita va ro'yxat shu holatga toraytiriladi, yana bosilsa — yechiladi.
 */
export function LiveStatusChips({
  counters,
  value,
  onChange,
  includeOffShift,
  className,
}: {
  counters: LiveCounters;
  includeOffShift: boolean;
  value: LiveStatus | null;
  onChange: (next: LiveStatus | null) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label="Holat bo'yicha filtr" className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {visibleLiveStatuses(includeOffShift).map((status) => {
        const active = value === status;
        return (
          <button
            key={status}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : status)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full border px-3 text-meta font-medium transition-colors",
              "focus-visible:ring-brand/30 focus-visible:ring-[3px] focus-visible:outline-none",
              active
                ? "border-brand bg-brand-soft text-ink"
                : "border-line bg-surface text-ink-muted hover:bg-subtle hover:text-ink",
            )}
          >
            <span aria-hidden className={cn("size-2 rounded-full", DOT[status])} />
            <span>{LABEL[status]}</span>
            <span className="text-ink tabular font-semibold">{counters[status]}</span>
          </button>
        );
      })}
    </div>
  );
}
