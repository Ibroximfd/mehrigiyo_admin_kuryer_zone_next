"use client";

import { useState } from "react";

import { groupThousands } from "@/lib/format";
import { cn } from "@/lib/utils";

import { UZ_MAP_PATHS, UZ_MAP_VIEWBOX } from "../map-paths";
import { regionShort } from "../regions";
import type { RegionStatus, RegionSummary } from "../types";

/**
 * O'zbekiston xaritasi — 14 viloyat bir ekranda (dizayn 1, «3»): rang
 * holatni bildiradi (yetarli / kam / muammo), har viloyat ustida qisqa nomi
 * va omborda dona, ustiga borilsa to'q kartocha, bosilsa pastdagi panel
 * o'sha viloyatga o'tadi. Tepada tanlov yo'q — xarita o'zi filtr.
 *
 * Yorliq joylari dizayn canvasidan (viloyat markazi har doim o'qiladigan
 * joy emas: Toshkent shahri uchun chiziqcha bilan tashqariga chiqariladi).
 * Ranglar faqat tokenlardan: yumshoq fon `*-soft`, tanlangan — to'liq rang.
 */
const FILL: Record<RegionStatus, { base: string; selected: string; ink: string }> = {
  ok: { base: "var(--ok-soft)", selected: "var(--ok)", ink: "var(--ok)" },
  low: { base: "var(--warn-soft)", selected: "var(--warn)", ink: "var(--warn)" },
  alert: { base: "var(--danger-soft)", selected: "var(--danger)", ink: "var(--danger)" },
};

export const REGION_STATUS_LABEL: Record<RegionStatus, string> = {
  ok: "yetarli",
  low: "kam qolgan",
  alert: "muammo",
};

/** Yorliq o'rni (viewBox koordinatasi); `leader` — nuqtadan yorliqqa chiziq. */
const LABELS: Record<string, { x: number; y: number; leader?: { x: number; y: number } }> = {
  toshkent_shahar: { x: 762, y: 296, leader: { x: 774, y: 334 } },
  toshkent: { x: 814, y: 330 },
  andijon: { x: 958, y: 374 },
  namangan: { x: 876, y: 345 },
  fargona: { x: 885, y: 406 },
  samarqand: { x: 607, y: 446 },
  buxoro: { x: 451, y: 419 },
  navoiy: { x: 488, y: 279 },
  qashqadaryo: { x: 590, y: 522 },
  surxondaryo: { x: 670, y: 586 },
  jizzax: { x: 677, y: 413 },
  sirdaryo: { x: 740, y: 401 },
  xorazm: { x: 273, y: 325 },
  qoraqalpogiston: { x: 168, y: 178 },
};

/** Tooltip uchun nuqta: chiziqcha bilan chiqarilgan yorliqda — nuqta, aks holda viloyat markazi. */
function anchorOf(code: string): { x: number; y: number } | undefined {
  const leader = LABELS[code]?.leader;
  if (leader) return leader;
  const shape = UZ_MAP_PATHS[code];
  return shape ? { x: shape.cx, y: shape.cy } : undefined;
}

export function UzMap({
  regions,
  selected,
  onSelect,
  readOnly = false,
  className,
}: {
  regions: RegionSummary[];
  selected: string | null;
  onSelect: (code: string) => void;
  /** Faqat ko'rish — tooltipda «kam» soni ko'rsatilmaydi (CRM). */
  readOnly?: boolean;
  className?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const byCode = new Map(regions.map((region) => [region.code, region]));
  const tooltip = hovered ? byCode.get(hovered) : undefined;
  const anchor = hovered ? anchorOf(hovered) : undefined;
  // Tanlangan viloyat chegarasi qo'shnilar ustida chizilsin.
  const codes = Object.keys(UZ_MAP_PATHS).sort((a, b) => Number(a === selected) - Number(b === selected));

  return (
    <div className={cn("bg-subtle border-line relative rounded-xl border px-2.5 pt-4 pb-2", className)}>
      <svg
        viewBox={`0 0 ${UZ_MAP_VIEWBOX.width} ${UZ_MAP_VIEWBOX.height}`}
        role="group"
        aria-label="Viloyatlar xaritasi"
        className="block h-auto w-full drop-shadow-sm"
      >
        {codes.map((code) => {
          const shape = UZ_MAP_PATHS[code]!;
          const region = byCode.get(code);
          const status = region?.status ?? "ok";
          const isSelected = selected === code;
          const isHovered = hovered === code;
          const fill = FILL[status];
          return (
            <path
              key={code}
              d={shape.path}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={region?.name ?? code}
              onClick={() => onSelect(code)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(code);
                }
              }}
              onMouseEnter={() => setHovered(code)}
              onMouseLeave={() => setHovered((current) => (current === code ? null : current))}
              onFocus={() => setHovered(code)}
              onBlur={() => setHovered(null)}
              style={{
                fill: isSelected || isHovered ? fill.selected : fill.base,
                stroke: isSelected ? "var(--ink)" : "var(--surface)",
                strokeWidth: isSelected ? 3 : 1.6,
                strokeLinejoin: "round",
              }}
              className="cursor-pointer outline-none transition-[fill] duration-(--dur-micro) focus-visible:[stroke:var(--brand)]"
            />
          );
        })}

        <g aria-hidden className="pointer-events-none select-none">
          {codes.map((code) => {
            const shape = UZ_MAP_PATHS[code]!;
            const label = LABELS[code] ?? { x: shape.cx, y: shape.cy };
            const region = byCode.get(code);
            const onDark = selected === code || hovered === code;
            return (
              <g key={code}>
                {label.leader ? (
                  <>
                    <circle cx={label.leader.x} cy={label.leader.y} r={5} style={{ fill: "var(--ink)", stroke: "var(--surface)", strokeWidth: 2 }} />
                    <line x1={label.leader.x} y1={label.leader.y - 6} x2={label.x + 2} y2={label.y + 4} style={{ stroke: "var(--ink)", strokeWidth: 1.5 }} />
                  </>
                ) : null}
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    fill: onDark && !label.leader ? "var(--surface)" : "var(--ink)",
                    paintOrder: "stroke",
                    stroke: onDark && !label.leader ? "transparent" : "var(--surface)",
                    strokeWidth: 3.5,
                    strokeLinejoin: "round",
                  }}
                >
                  {regionShort(code)}
                </text>
                {region ? (
                  <text
                    x={label.x}
                    y={label.y + 15}
                    textAnchor="middle"
                    className="font-mono"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      fill: onDark && !label.leader ? "var(--surface)" : "var(--ink-muted)",
                      paintOrder: "stroke",
                      stroke: onDark && !label.leader ? "transparent" : "var(--surface)",
                      strokeWidth: 3,
                      strokeLinejoin: "round",
                    }}
                  >
                    {groupThousands(region.onHand)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>

      {tooltip && anchor ? (
        <div
          role="status"
          className="bg-ink text-surface pointer-events-none absolute z-10 w-56 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl p-3.5 shadow-e2"
          style={{
            left: `${(anchor.x / UZ_MAP_VIEWBOX.width) * 100}%`,
            top: `${(anchor.y / UZ_MAP_VIEWBOX.height) * 100}%`,
          }}
        >
          <p className="text-body font-bold">{tooltip.name}</p>
          <dl className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-meta opacity-90">
            <dt>Omborda</dt>
            <dd className="tabular text-right font-mono font-semibold">{groupThousands(tooltip.onHand)}</dd>
            <dt>Kuryerlarda</dt>
            <dd className="tabular text-right font-mono font-semibold">{groupThousands(tooltip.withCouriers)}</dd>
            {!readOnly ? (
              <>
                <dt>Kam qolgan</dt>
                <dd className="tabular text-right font-mono font-semibold" style={{ color: tooltip.lowItems > 0 ? "var(--danger-soft)" : undefined }}>
                  {tooltip.lowItems}
                </dd>
              </>
            ) : (
              <>
                <dt>Kuryer</dt>
                <dd className="tabular text-right font-mono font-semibold">{tooltip.couriers}</dd>
              </>
            )}
            <dt>Bugun yetkazildi</dt>
            <dd className="tabular text-right font-mono font-semibold" style={{ color: "var(--ok-soft)" }}>
              {groupThousands(tooltip.deliveredToday)}
            </dd>
          </dl>
        </div>
      ) : null}
    </div>
  );
}

/** Rang izohi — xarita kartasi sarlavhasida (dizayn: legend o'ngda). */
export function MapLegend({ className }: { className?: string }) {
  return (
    <ul className={cn("text-ink-muted flex flex-wrap gap-x-3.5 gap-y-1 text-meta", className)} aria-label="Rang izohi">
      {(Object.keys(FILL) as RegionStatus[]).map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm" style={{ backgroundColor: FILL[status].selected }} />
          {REGION_STATUS_LABEL[status]}
        </li>
      ))}
    </ul>
  );
}

export const REGION_STATUS_COLOR: Record<RegionStatus, string> = {
  ok: FILL.ok.ink,
  low: FILL.low.ink,
  alert: FILL.alert.ink,
};
