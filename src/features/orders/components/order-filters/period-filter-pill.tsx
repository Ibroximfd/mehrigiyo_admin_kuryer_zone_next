"use client";

import { CalendarRange } from "lucide-react";

import { DateRangeField, describeRange } from "@/components/kit/date-range";
import { FilterDropdown } from "@/components/kit/filter-dropdown";
import { DEFAULT_ORDER_PERIOD, ORDER_PERIODS } from "@/features/orders/types";
import type { OrderFilters } from "@/features/orders/use-order-filters";

/** Davr: presetlar + aniq oraliq (bir-birini inkor qiladi, aniq sana ustun). */
export function PeriodFilterPill({ filters: f }: { filters: OrderFilters }) {
  const presetLabel =
    ORDER_PERIODS.find((item) => item.value === f.period)?.label ?? null;
  const valueLabel = f.hasCustomDates
    ? describeRange(f.dateFrom ?? "", f.dateTo ?? "")
    : f.period !== DEFAULT_ORDER_PERIOD
      ? presetLabel
      : null;

  const resetDates = () => {
    void f.setDateFrom(null);
    void f.setDateTo(null);
  };

  return (
    <FilterDropdown
      label="Davr"
      icon={CalendarRange}
      options={ORDER_PERIODS.map((item) => ({
        value: item.value,
        label: item.label,
      }))}
      // Aniq sana ishlayotganda bironta preset yonmaydi — ro'yxat yolg'on
      // gapirmasligi kerak.
      selected={f.hasCustomDates ? [] : [f.period]}
      onSelect={(value) => {
        void f.setPeriod(value);
        resetDates();
      }}
      valueLabel={valueLabel}
      onClear={
        f.periodActive
          ? () => {
              void f.setPeriod(DEFAULT_ORDER_PERIOD);
              resetDates();
            }
          : undefined
      }
      contentClassName="w-[19.5rem]"
      footer={
        <div className="border-line border-t p-1.5">
          <p className="text-ink-faint px-1.5 pb-1 text-fine font-medium tracking-wide uppercase">
            Aniq oraliq
          </p>
          <DateRangeField
            from={f.dateFrom ?? ""}
            to={f.dateTo ?? ""}
            onChange={(nextFrom, nextTo) => {
              void f.setDateFrom(nextFrom || null);
              void f.setDateTo(nextTo || null);
              void f.setPeriod(DEFAULT_ORDER_PERIOD);
            }}
            onClear={resetDates}
          />
        </div>
      }
    />
  );
}
