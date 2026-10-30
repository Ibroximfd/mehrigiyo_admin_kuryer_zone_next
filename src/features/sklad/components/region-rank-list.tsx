"use client";

import { StatusPill } from "@/components/kit/status-pill";
import { groupThousands } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { RegionSummary } from "../types";
import { REGION_STATUS_COLOR, REGION_STATUS_LABEL } from "./uz-map";

/**
 * Viloyatlar ro'yxati (dizayn 1, «4») — xarita bilan bir xil ma'lumot,
 * ko'pdan kamga, chiziq bilan. Kichik viloyatni xaritadan topolmasa shu
 * yerdan bosadi; tanlangani xarita bilan bog'liq.
 */
export function RegionRankList({
  regions,
  selected,
  onSelect,
}: {
  regions: RegionSummary[];
  selected: string | null;
  onSelect: (code: string) => void;
}) {
  const ranked = [...regions].sort((a, b) => b.onHand - a.onHand);
  const max = Math.max(1, ...ranked.map((region) => region.onHand));

  return (
    <ol className="flex flex-col gap-0.5" aria-label="Viloyatlar — omborda dona">
      {ranked.map((region) => {
        const active = region.code === selected;
        const color = REGION_STATUS_COLOR[region.status];
        return (
          <li key={region.code}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(region.code)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg border px-2 py-1.5 text-left transition-colors",
                active ? "border-brand/40 bg-brand-soft" : "hover:bg-subtle border-transparent",
              )}
            >
              <span className="text-ink w-28 shrink-0 truncate text-dense font-semibold" data-no-translit>
                {region.name}
              </span>
              <span className="bg-surface-3 relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
                {/* Kenglik — eng katta viloyatga nisbatan hisoblangan. */}
                <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(region.onHand / max) * 100}%`, backgroundColor: color }} />
              </span>
              <span className="text-ink tabular w-14 shrink-0 text-right font-mono text-dense font-semibold">{groupThousands(region.onHand)}</span>
              <StatusPill label={REGION_STATUS_LABEL[region.status]} color={color} size="sm" className="w-24 shrink-0 justify-center" />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
