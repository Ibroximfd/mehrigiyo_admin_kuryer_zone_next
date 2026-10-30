"use client";

import { ArrowDownUp } from "lucide-react";

import { FilterDropdown } from "@/components/kit/filter-dropdown";
import { DEFAULT_ORDER_SORT, ORDER_SORTS, isOrderSort } from "@/features/orders/order-sort";
import type { OrderSort } from "@/features/orders/order-sort";

/**
 * Doska ustunlari va ro'yxat tartibi. Sukut — "Status bo'yicha (yangi
 * tepada)": oxirgi ko'chirilgan buyurtma o'z ustunining tepasida.
 * Sukutdan boshqasi tanlansa pill rangli bo'lib, qiymati ko'rinadi.
 */
export function SortPill({
  value,
  onChange,
}: {
  value: OrderSort;
  onChange: (next: OrderSort) => void;
}) {
  const current = ORDER_SORTS.find((item) => item.value === value);
  return (
    <FilterDropdown
      label="Tartib"
      icon={ArrowDownUp}
      options={ORDER_SORTS.map((item) => ({ value: item.value, label: item.label }))}
      selected={[value]}
      valueLabel={value === DEFAULT_ORDER_SORT ? null : (current?.label ?? null)}
      onSelect={(next) => {
        if (isOrderSort(next)) onChange(next);
      }}
      onClear={value === DEFAULT_ORDER_SORT ? undefined : () => onChange(DEFAULT_ORDER_SORT)}
    />
  );
}
