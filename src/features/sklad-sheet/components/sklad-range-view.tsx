"use client";

import { SearchX, Table } from "lucide-react";

import { DateRangeField } from "@/components/kit/date-range";
import { Section } from "@/components/kit/key-figures";
import { QueryStateView } from "@/components/kit/query-state";
import { SelectField } from "@/components/kit/select-field";
import { EmptyView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { SkladStockFallback } from "../current-stock";
import { isSameRange, monthRange, rangeTitle, weekRange } from "../period";
import { buildRangeSheet, regionOptions } from "../range-sheet";
import type { RegionOption } from "../range-sheet";
import type { SkladSheet } from "../types";
import { useSkladSheet, useSkladSheetPeriod } from "../use-sklad-sheet";
import { CurrentStockPanel, selectCurrentStock } from "./current-stock-panel";
import { RangeSheetTable } from "./range-sheet-table";
import { SkladSheetExcelButton } from "./sklad-sheet-excel-button";

/**
 * «Sanadan sanagacha» (hujjat 85 §1.5, egasi maketi SkladHafta): sanalar
 * (sukut — shu hafta), «Shu hafta» / «Shu oy», hudud tanlovi; har kun bo'yicha
 * sotuv, sovg'a, manzil va kuryer xizmati. Sana bosilsa — kunlik jadval.
 * `regions` — skladingiz viloyatlari (hudud tanlovi qisqarib qolmasin).
 */
export function SkladRangeView({ fallback, regions }: { fallback: readonly SkladStockFallback[]; regions: readonly RegionOption[] }) {
  const period = useSkladSheetPeriod();
  const query = { ...period.range, region: period.region };
  const sheet = useSkladSheet(query);
  const options = regionOptions(sheet.data?.rows ?? [], regions, period.region);
  const regionName = options.find((option) => option.value === period.region)?.label ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeField from={period.range.dateFrom} to={period.range.dateTo} onChange={period.setRange} />
        <PresetButton active={isSameRange(period.range, weekRange(period.today))} onClick={period.showWeek}>
          Shu hafta
        </PresetButton>
        <PresetButton active={isSameRange(period.range, monthRange(period.today))} onClick={period.showMonth}>
          Shu oy
        </PresetButton>
        <SelectField
          label="Hudud"
          allLabel="Hammasi"
          value={period.region}
          options={options.map((option) => ({ ...option, translate: false }))}
          onChange={period.setRegion}
          className="w-auto min-w-40"
        />
        <div className="ml-auto">
          <SkladSheetExcelButton query={query} />
        </div>
      </div>
      <CurrentStockPanel model={selectCurrentStock(sheet, fallback)} />
      <Section title="Kunlik savdo mahsulotlari" description={[regionName, rangeTitle(period.range)].filter(Boolean).join(" · ")}>
        <QueryStateView
          query={sheet}
          deniedTitle="Sklad jadvali sizga ochilmagan"
          missingTitle="Sklad jadvali — server hali chiqarmagan"
          skeleton={<Skeleton className="h-96 rounded-2xl" aria-label="Yuklanmoqda" />}
        >
          {(data) => (
            <RangeSheetBody
              sheet={data}
              dayHref={period.dayHref}
              filtered={period.region !== null}
              onClearRegion={() => period.setRegion(null)}
            />
          )}
        </QueryStateView>
      </Section>
    </div>
  );
}

/** Tayyor holat: kun bo'yicha jadval; kun yo'q — bo'sh yoki (hudud tanlangan) «topilmadi». */
export function RangeSheetBody({
  sheet,
  dayHref,
  filtered,
  onClearRegion,
}: {
  sheet: SkladSheet;
  dayHref: (day: string) => string;
  filtered: boolean;
  onClearRegion: () => void;
}) {
  const model = buildRangeSheet(sheet);
  if (model.days.length === 0) {
    return filtered ? (
      <EmptyView
        Icon={SearchX}
        title="Bu hududda sotuv yo'q"
        description="Tanlangan davrda shu hududga yetkazilgan zakaz yo'q."
        action={
          <Button variant="outline" onClick={onClearRegion}>
            Hamma hududlar
          </Button>
        }
        className="border-line bg-surface rounded-2xl border"
      />
    ) : (
      <EmptyView
        Icon={Table}
        title="Bu davrda sotuv yo'q"
        description="Kuryerlar yetkazgan zakaz yo'q. Boshqa sanalarni tanlang."
        className="border-line bg-surface rounded-2xl border"
      />
    );
  }
  return (
    <>
      <RangeSheetTable model={model} products={sheet.products} dayHref={dayHref} />
      <ul className="text-ink-muted flex flex-col gap-x-6 gap-y-1 text-meta lg:flex-row lg:flex-wrap">
        <li>Sana bosilsa — o&apos;sha kunning to&apos;liq kunlik jadvali ochiladi</li>
        <li>Kuryer xizmat narxi — viloyat narxi; jami — bosh kuryer «Sotuv jadvali»da yozgani</li>
      </ul>
    </>
  );
}

function PresetButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="outline" aria-pressed={active} onClick={onClick} className={cn(active && "border-brand bg-brand-soft text-brand")}>
      {children}
    </Button>
  );
}
