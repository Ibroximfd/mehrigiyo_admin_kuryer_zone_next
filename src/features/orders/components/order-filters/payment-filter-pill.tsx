"use client";

import { Wallet } from "lucide-react";

import { FilterDropdown } from "@/components/kit/filter-dropdown";
import {
  PAYMENT_METHOD_FILTERS,
  PAYMENT_STATE_FILTERS,
} from "@/features/orders/types";
import type { OrderFilters } from "@/features/orders/use-order-filters";

/**
 * To'lov — holati va turi bitta pillda (serverda: `?is_paid=`,
 * `?payment_method=`), ya'ni doska ustunlari ham shu bo'yicha suziladi.
 */
export function PaymentFilterPill({ filters: f }: { filters: OrderFilters }) {
  return (
    <FilterDropdown
      label="To'lov"
      icon={Wallet}
      sections={[
        {
          key: "state",
          heading: "Holati",
          options: PAYMENT_STATE_FILTERS.map((item) => ({
            value: item.value,
            label: item.label,
            color: item.value === "unpaid" ? "var(--warn)" : "var(--ok)",
          })),
          selected: f.paidFilter ? [f.paidFilter] : [],
          onSelect: (value) =>
            void f.setPaidFilter(f.paidFilter === value ? null : value),
        },
        {
          key: "method",
          heading: "Turi",
          options: PAYMENT_METHOD_FILTERS.map((item) => ({
            value: item.value,
            label: item.label,
          })),
          selected: f.methodFilter ? [f.methodFilter] : [],
          onSelect: (value) =>
            void f.setMethodFilter(f.methodFilter === value ? null : value),
        },
      ]}
      onClear={
        f.paidFilter || f.methodFilter
          ? () => {
              void f.setPaidFilter(null);
              void f.setMethodFilter(null);
            }
          : undefined
      }
      closeOnSelect={false}
    />
  );
}
