"use client";

import { useState } from "react";

import {
  UZ_MAP_ARAL,
  UZ_MAP_REGIONS,
  UZ_MAP_VIEWBOX,
  pointToPercent,
  regionLabelPoint,
} from "@/lib/uz-map";
import type { UzRegionCode } from "@/lib/uz-map";
import { cn } from "@/lib/utils";

/**
 * Bir rangli hududlar uchun to'plam: bitta hudud (masalan sklad) bir necha
 * viloyatni qamraydi va ularning hammasi bir xil rangda bo'yaladi.
 */
export type RegionMapArea = {
  id: string;
  /** Rang tartibi (0…4) — `--sklad-N` tokenlari; rang hududga ergashadi. */
  colorIndex: number;
  regions: readonly UzRegionCode[];
  /** Ajratilgan hudud to'liq rangda, qolganlari suyultirilgan. */
  highlighted: boolean;
};

/** Tailwind sinflari to'liq yozilgan bo'lishi shart — dinamik yig'ilsa CSS chiqmaydi. */
const FILL = ["fill-sklad-1", "fill-sklad-2", "fill-sklad-3", "fill-sklad-4", "fill-sklad-5"] as const;
const FILL_MUTED = [
  "fill-sklad-1-muted",
  "fill-sklad-2-muted",
  "fill-sklad-3-muted",
  "fill-sklad-4-muted",
  "fill-sklad-5-muted",
] as const;
export const AREA_SWATCH = ["bg-sklad-1", "bg-sklad-2", "bg-sklad-3", "bg-sklad-4", "bg-sklad-5"] as const;

function pick<T>(list: readonly T[], index: number): T {
  return list[((index % list.length) + list.length) % list.length]!;
}

/**
 * O'zbekiston viloyatlari xaritasi: bir hududga tegishli viloyatlar bitta
 * rangda, ajratilgani to'liq, qolganlari suyultirilgan. Sichqoncha yoki
 * klaviatura bilan viloyat ustiga kelinsa — butun hudud chegarasi yonadi va
 * yonida `tooltip` chiqadi. Rang yolg'iz signal emas: nom va raqamlar
 * tooltipda va sahifadagi jadvalda yozilgan.
 */
export function RegionMap({
  areas,
  label,
  regionName,
  tooltip,
  className,
}: {
  areas: readonly RegionMapArea[];
  /** Ekran o'quvchi uchun xarita nomi. */
  label: string;
  regionName: (code: UzRegionCode) => string;
  tooltip: (areaId: string, region: UzRegionCode) => React.ReactNode;
  className?: string;
}) {
  const [hovered, setHovered] = useState<UzRegionCode | null>(null);
  const areaOf = (code: UzRegionCode) => areas.find((area) => area.regions.includes(code)) ?? null;
  const hoveredArea = hovered ? areaOf(hovered) : null;
  const point = hovered ? pointToPercent(regionLabelPoint(hovered)) : null;

  return (
    <div className={cn("relative", className)}>
      <svg viewBox={UZ_MAP_VIEWBOX} role="group" aria-label={label} className="h-auto w-full">
        <path d={UZ_MAP_ARAL} className="fill-info-soft stroke-line" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {UZ_MAP_REGIONS.map((shape) => {
          const area = areaOf(shape.code);
          const inHoveredArea = hoveredArea !== null && area?.id === hoveredArea.id;
          return (
            <path
              key={shape.code}
              d={shape.path}
              role="img"
              tabIndex={0}
              aria-label={regionName(shape.code)}
              onPointerEnter={() => setHovered(shape.code)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(shape.code)}
              onBlur={() => setHovered(null)}
              className={cn(
                "stroke-surface cursor-default outline-none transition-colors duration-(--dur-micro)",
                area ? (area.highlighted ? pick(FILL, area.colorIndex) : pick(FILL_MUTED, area.colorIndex)) : "fill-subtle",
                inHoveredArea && "stroke-ink",
              )}
              strokeWidth={inHoveredArea ? 2 : 1.2}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {hovered && hoveredArea && point ? (
        <div
          role="tooltip"
          // Joylashuv xarita nuqtasidan hisoblanadi — token emas, o'lchangan qiymat.
          style={{ left: `${point.left}%`, top: `${point.top}%` }}
          className={cn(
            "border-line bg-elevated shadow-e3 pointer-events-none absolute z-10 w-64 max-w-full rounded-xl border p-3",
            point.left > 62 ? "-ml-3 -translate-x-full" : point.left < 38 ? "ml-3" : "-translate-x-1/2",
            point.top < 40 ? "mt-4" : "-mt-4 -translate-y-full",
          )}
        >
          {tooltip(hoveredArea.id, hovered)}
        </div>
      ) : null}
    </div>
  );
}
