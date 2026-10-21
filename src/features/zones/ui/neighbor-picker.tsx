"use client";

import { Check } from "lucide-react";

import { useT } from "@/shared/i18n/locale";
import { cn } from "@/shared/lib/utils";

import type { Zone } from "../model/zone";

/** Qo'shni zonalar — faqat shu viloyatdagilar, o'zidan tashqari. Tugma-chiplar. */
export function NeighborPicker({
  zones,
  value,
  onChange,
}: {
  zones: readonly Zone[];
  value: readonly number[];
  onChange: (ids: number[]) => void;
}) {
  const t = useT();
  if (zones.length === 0) return <p className="text-sm text-ink-faint">{t.zones.neighborsEmpty}</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {zones.map((zone) => {
        const pressed = value.includes(zone.id);
        return (
          <button
            key={zone.id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(pressed ? value.filter((id) => id !== zone.id) : [...value, zone.id])}
            className={cn(
              "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm transition outline-none sm:min-h-9",
              "focus-visible:ring-3 focus-visible:ring-ring/40",
              pressed ? "border-brand bg-brand-soft text-brand-soft-ink" : "border-line-strong text-ink-muted hover:bg-surface-2",
              !zone.isActive && "opacity-70",
            )}
          >
            {pressed ? <Check className="size-4" aria-hidden /> : null}
            {zone.name}
          </button>
        );
      })}
    </div>
  );
}
