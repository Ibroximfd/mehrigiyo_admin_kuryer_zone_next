"use client";

import { DateRangeField } from "@/components/kit/date-range";
import { FilterChips } from "@/components/kit/filter-chips";
import { STAT_PERIODS, hasCustomDates } from "@/features/statistics/filter";
import type { StatPeriod } from "@/features/statistics/filter";
import type { StatFilterControls } from "@/features/statistics/use-stat-filter";
import { cn } from "@/lib/utils";

/**
 * Davr tanlash qatori — operator, admin va operator detali ekranida
 * **aynan bitta** komponent. Hujjatning §5.2 talabi: uchala ekran ham
 * bir xil parametr yuborsin.
 *
 * Preset chiplari va aniq sana yonma-yon turadi. Ular bir-birini inkor
 * qiladi: sana tanlansa chiplardan tanlov olinadi (backendda ham sana
 * ustun), preset tanlansa sanalar tozalanadi.
 */
export function StatPeriodFilter({
  controls,
  className,
}: {
  controls: StatFilterControls;
  className?: string;
}) {
  const { filter, selectPeriod, selectRange, resetDates } = controls;
  const custom = hasCustomDates(filter);

  // `?date=` havoladan kelgan bo'lsa ikkala maydonda ham o'sha kun turadi —
  // "bitta kun" oraliqning aynan o'zi.
  const from = filter.date ?? filter.dateFrom ?? "";
  const to = filter.date ?? filter.dateTo ?? "";

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 lg:flex-row lg:items-center",
        className,
      )}
    >
      <FilterChips<StatPeriod | null>
        options={STAT_PERIODS.map((item) => ({
          value: item.value,
          label: item.label,
        }))}
        // Aniq sana ishlayotganda bironta preset yonmaydi — filtr qatori
        // yolg'on gapirmasligi kerak.
        value={custom ? null : filter.period}
        onChange={(value) => {
          if (value) selectPeriod(value);
        }}
        label="Davr bo'yicha filtr"
      />

      <DateRangeField
        from={from}
        to={to}
        onChange={(nextFrom, nextTo) => selectRange(nextFrom, nextTo)}
        onClear={custom ? resetDates : undefined}
      />
    </div>
  );
}
