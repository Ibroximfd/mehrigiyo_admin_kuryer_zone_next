"use client";

import { DateRangeField } from "@/components/kit/date-range";
import type { DayRangeControls } from "@/hooks/use-day-range";
import { cn } from "@/lib/utils";

/** Davr: «Bugun», «Kecha» yoki sana oralig'i — bitta qatorda. */
export function PeriodPicker({ period, className }: { period: DayRangeControls; className?: string }) {
  return (
    <div role="group" aria-label="Davr" className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <PresetChip active={period.preset === "today"} onClick={period.setToday}>
        Bugun
      </PresetChip>
      <PresetChip active={period.preset === "yesterday"} onClick={period.setYesterday}>
        Kecha
      </PresetChip>
      <DateRangeField
        from={period.preset === "custom" ? period.from : ""}
        to={period.preset === "custom" ? period.to : ""}
        onChange={period.setRange}
        onClear={period.preset === "custom" ? period.setToday : undefined}
      />
    </div>
  );
}

function PresetChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-(--control-h) items-center rounded-full border px-3.5 text-dense font-medium transition-colors duration-(--dur-micro)",
        active
          ? "border-brand bg-brand-soft text-brand"
          : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
