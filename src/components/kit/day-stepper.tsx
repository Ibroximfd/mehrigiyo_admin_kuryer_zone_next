"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dayTitle, shiftIsoDay } from "@/lib/iso-day";
import { cn } from "@/lib/utils";

/**
 * Kun tanlash: oldingi/keyingi kun, sana maydoni va «Bugun»ga qaytish.
 * Kelajak kun tanlanmaydi (`today` — chegara). Ko'ringan yozuv ustida
 * brauzerning o'z sana maydoni yotadi (ko'rinmas): bosilganda native kalendar
 * ochiladi, klaviatura va skrinrider ham brauzerdan.
 */
export function DayStepper({ day, today, onChange }: { day: string; today: string; onChange: (day: string) => void }) {
  const isToday = day >= today;
  return (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="icon" aria-label="Oldingi kun" onClick={() => onChange(shiftIsoDay(day, -1))}>
        <ChevronLeft />
      </Button>
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
          max={today}
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
      <Button variant="outline" size="icon" aria-label="Keyingi kun" disabled={isToday} onClick={() => onChange(shiftIsoDay(day, 1))}>
        <ChevronRight />
      </Button>
      {isToday ? null : (
        <Button variant="ghost" onClick={() => onChange(today)}>
          Bugun
        </Button>
      )}
    </div>
  );
}
