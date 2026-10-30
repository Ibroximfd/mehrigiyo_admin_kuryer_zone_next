"use client";

import { Layers, TriangleAlert } from "lucide-react";

import { SingleChoicePill } from "@/features/orders/components/order-filters/single-choice-pill";
import type { OrderFilters } from "@/features/orders/use-order-filters";

export const LIST_GROUPINGS = [
  { value: "region", label: "viloyat" },
  { value: "status", label: "status" },
  { value: "courier", label: "kuryer" },
] as const;

export type ListGrouping = (typeof LIST_GROUPINGS)[number]["value"];

/** Ro'yxat ko'rinishining ikkinchi qatori: guruhlash va belgilar. */
export function ListViewPills({ filters: f }: { filters: OrderFilters }) {
  return (
    <>
      <SingleChoicePill
        label="Guruhlash"
        icon={Layers}
        options={LIST_GROUPINGS.map((item) => ({ ...item }))}
        value={f.grouping}
        onChange={(next) => void f.setGrouping(next)}
      />
      <SingleChoicePill
        label="Belgi"
        icon={TriangleAlert}
        options={[
          { value: "no-address", label: "Manzilsiz", color: "var(--warn)" },
          /*
           * Geokod muammosi (2026-10-16 B4): taxminiy yoki tumandan
           * tashqari manzil. Serverda `?needs_review=` parametri hali
           * yo'q — yuklangan ro'yxat ustida mijozda filtrlanadi.
           */
          { value: "address-issue", label: "Manzil muammosi", color: "var(--warn)" },
          { value: "duplicate", label: "Dublikat", color: "var(--danger)" },
        ]}
        value={f.flagFilter}
        onChange={(next) => void f.setFlagFilter(next)}
      />
    </>
  );
}
