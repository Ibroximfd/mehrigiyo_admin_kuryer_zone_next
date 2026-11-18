"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

import { chiefCan } from "@/features/chief/types";
import type { ChiefMe } from "@/features/chief/types";
import { cn } from "@/lib/utils";

import { IssuePlanView } from "./issue-plan-view";
import { SalesSheetView } from "./sales-sheet-view";

const TABS = [
  { value: "sheet", label: "Sotuv jadvali" },
  { value: "plan", label: "Berish rejasi" },
] as const;

const TAB_VALUES = TABS.map((tab) => tab.value);

/**
 * «Sotuv jadvali» bo'limi (hujjat 83): ikki tab, tanlangani URLda (`?tab=`) —
 * havola ulashilsa ayni ko'rinish ochiladi.
 */
export function SalesSheetSection({ me }: { me: ChiefMe }) {
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(TAB_VALUES).withDefault("sheet"));
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Sotuv jadvali bo'limlari" className="bg-surface-3 inline-flex w-fit gap-0.5 rounded-lg p-0.5">
        {TABS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={tab === option.value}
            onClick={() => void setTab(option.value)}
            className={cn(
              "h-9 rounded-md px-3.5 text-dense font-semibold transition-colors",
              tab === option.value ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {tab === "plan" ? <IssuePlanView canOpenSklad={chiefCan(me, "warehouse.view_courier_stores")} /> : <SalesSheetView />}
    </div>
  );
}
