"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { DateRangeField } from "@/components/kit/date-range";
import { Button } from "@/components/ui/button";
import { todayIso } from "@/lib/format";
import { cn } from "@/lib/utils";

import { dayTitle, rangeTitle, SHEET_PERIODS } from "../period";
import type { PeriodOption } from "../period";
import type { SheetPeriodControls } from "../use-sheet-period";

/**
 * Davr boshqaruvi: Kun · Hafta · Oy · Oraliq (yoki `periods` dagi qismi). Kun
 * rejimida — oldingi/keyingi kun, sana tanlash va «Bugun»ga qaytish; hafta va
 * oyda — haqiqiy oraliq yozuvi; oraliqda — ikki sana maydoni.
 */
export function SheetPeriodBar({
  controls,
  periods = SHEET_PERIODS,
  children,
}: {
  controls: SheetPeriodControls;
  periods?: readonly PeriodOption[];
  children?: React.ReactNode;
}) {
  const { period, range } = controls;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Davr" className="bg-surface-3 inline-flex gap-0.5 rounded-lg p-0.5">
        {periods.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={period === option.value}
            onClick={() => controls.setPeriod(option.value)}
            className={cn(
              "h-8 rounded-md px-3 text-dense font-semibold transition-colors",
              period === option.value ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {period === "day" ? (
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" aria-label="Oldingi kun" onClick={() => controls.shiftDay(-1)}>
            <ChevronLeft />
          </Button>
          <DayPicker day={range.dateFrom} onChange={controls.setDay} />
          <Button variant="outline" size="icon" aria-label="Keyingi kun" disabled={controls.isToday} onClick={() => controls.shiftDay(1)}>
            <ChevronRight />
          </Button>
          {controls.isToday ? null : (
            <Button variant="ghost" onClick={() => controls.setDay(todayIso())}>
              Bugun
            </Button>
          )}
        </div>
      ) : period === "range" ? (
        <DateRangeField from={range.dateFrom} to={range.dateTo} onChange={controls.setRange} />
      ) : (
        <span className="border-line bg-surface text-ink tabular flex h-(--control-h) items-center rounded-full border px-3.5 text-dense font-semibold">
          {rangeTitle(range)}
        </span>
      )}

      {children ? <div className="ml-auto flex items-center gap-2">{children}</div> : null}
    </div>
  );
}

/**
 * Tanlangan kun — «16.11.2026 · dushanba». Ko'ringan yozuv ustida brauzerning
 * o'z sana maydoni yotadi (ko'rinmas): bosilganda native kalendar ochiladi,
 * klaviatura va skrinrider ham brauzerdan — yangi sana tanlash mantig'i yo'q.
 */
function DayPicker({ day, onChange }: { day: string; onChange: (day: string) => void }) {
  return (
    <span
      data-focus-ring="host"
      className={cn(
        "border-brand/45 bg-brand-soft text-brand relative flex h-(--control-h) items-center gap-1.5 rounded-full border px-3.5",
        "focus-within:border-brand focus-within:ring-brand/20 focus-within:ring-2",
      )}
    >
      <CalendarDays aria-hidden className="size-4 shrink-0" />
      <span aria-hidden className="tabular text-dense font-semibold whitespace-nowrap">
        {dayTitle(day)}
      </span>
      <input
        type="date"
        aria-label="Kun"
        value={day}
        max={todayIso()}
        onChange={(event) => {
          if (event.target.value) onChange(event.target.value);
        }}
        onClick={(event) => {
          try {
            event.currentTarget.showPicker();
          } catch {
            // Kalendar ochilmasa (eski brauzer, begona iframe) — maydon klaviatura bilan ishlayveradi.
          }
        }}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      />
    </span>
  );
}
