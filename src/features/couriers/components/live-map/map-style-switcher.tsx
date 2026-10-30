"use client";

import { Layers } from "lucide-react";

import { MAP_STYLE_LABEL, availableMapStyles } from "@/features/couriers/map-style";
import type { MapStyle } from "@/features/couriers/map-style";
import { cn } from "@/lib/utils";

/** "Yandex · Standart · Oddiy · Batafsil · Qorong'i" — xarita foni; tanlov brauzerda eslab qolinadi. */
export function MapStyleSwitcher({
  value,
  onChange,
  className,
}: {
  value: MapStyle;
  onChange: (next: MapStyle) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Xarita ko'rinishi"
      className={cn(
        "border-line bg-surface/95 elev-1 flex h-9 items-center gap-0.5 rounded-lg border p-0.5 backdrop-blur",
        className,
      )}
    >
      <Layers className="text-ink-faint mx-1.5 size-3.5 shrink-0" aria-hidden />
      {availableMapStyles().map((style) => {
        const active = style === value;
        return (
          <button
            key={style}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(style)}
            className={cn(
              "h-full rounded-md px-2.5 text-meta font-medium transition-colors duration-(--dur-micro)",
              "focus-visible:ring-brand/30 focus-visible:ring-[3px] focus-visible:outline-none",
              active ? "bg-brand-soft text-ink" : "text-ink-muted hover:bg-subtle hover:text-ink",
            )}
          >
            {MAP_STYLE_LABEL[style]}
          </button>
        );
      })}
    </div>
  );
}
