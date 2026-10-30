"use client";

import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { fetchChiefOptions } from "@/features/chief/api";
import { activeFilterChips } from "@/features/orders/active-filters";
import type { ActiveFilterChip } from "@/features/orders/active-filters";
import { DEFAULT_ORDER_PERIOD } from "@/features/orders/types";
import type { OrderFilters } from "@/features/orders/use-order-filters";
import { queryKeys } from "@/lib/query-keys";

/**
 * Tanlangan filtrlar qatori — har biri bir bosishda olib tashlanadi,
 * oxirida «Tozalash». Filtr yo'q bo'lsa qator chizilmaydi.
 */
export function ActiveFilterChips({
  filters: f,
  couriers,
}: {
  filters: OrderFilters;
  couriers: Array<{ id: number; fullName: string }> | null;
}) {
  const chiefs = useQuery({
    queryKey: queryKeys.chiefOptions(null),
    queryFn: ({ signal }) => fetchChiefOptions(null, signal),
    staleTime: 5 * 60_000,
    retry: false,
    enabled: f.chief !== null && f.chief !== "none",
  });
  const chips = activeFilterChips(f, {
    courierName: (id) => couriers?.find((courier) => courier.id === id)?.fullName ?? null,
    chiefName: (id) => chiefs.data?.find((chief) => chief.id === id)?.fullName ?? null,
  });
  if (chips.length === 0) return null;

  const remove = (chip: ActiveFilterChip) => {
    switch (chip.key) {
      case "status":
        return void f.setStatuses(null);
      case "period":
        void f.setPeriod(DEFAULT_ORDER_PERIOD);
        void f.setDateFrom(null);
        return void f.setDateTo(null);
      case "courier":
        return void f.setCourierId(null);
      case "chief":
        return void f.setChief(null);
      case "creator":
        return void f.setCreator(null);
      case "payment":
        void f.setPaidFilter(null);
        return void f.setMethodFilter(null);
      case "app":
        return void f.setApp(null);
      case "deliveryDate":
        return void f.setDeliveryDate(null);
      case "region": {
        const next = f.regions.filter((code) => code !== chip.value);
        return void f.setRegions(next.length ? next : null);
      }
      case "zone":
        return void f.setZones(null);
      case "district":
        return void f.setDistricts(null);
      case "suggested":
        return void f.setSuggested(null);
      case "tag":
        return void f.setTagFilter(null);
      case "flag":
        return void f.setFlagFilter(null);
      case "source":
        return void f.setSource(null);
      case "quick":
        return void f.setQuick(null);
    }
  };

  return (
    // Bitta qatorda, sig'masa suriladi (sarlavha balandligi o'zgarmaydi).
    <div role="group" aria-label="Tanlangan filtrlar" className="flex w-max items-center gap-1.5">
      {chips.map((chip) => (
        <button
          key={`${chip.key}:${chip.value ?? ""}`}
          type="button"
          onClick={() => remove(chip)}
          aria-label={`${chip.label} — olib tashlash`}
          className="bg-brand-soft text-brand hover:bg-brand/15 focus-visible:ring-brand/40 inline-flex h-7 max-w-64 shrink-0 items-center gap-1 rounded-full pr-1.5 pl-2.5 text-meta font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <span className="truncate">{chip.label}</span>
          <X className="size-3.5 shrink-0" aria-hidden />
        </button>
      ))}
      <button
        type="button"
        onClick={f.clearAll}
        className="text-ink-muted hover:text-ink shrink-0 px-1.5 text-meta font-medium whitespace-nowrap transition-colors"
      >
        Tozalash
      </button>
    </div>
  );
}
