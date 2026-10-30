"use client";

import {
  CalendarDays,
  CircleDot,
  Smartphone,
  Sparkles,
  Tag,
  UserRound,
  UserRoundCog,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { FilterDropdown } from "@/components/kit/filter-dropdown";
import { fetchChiefOptions } from "@/features/chief/api";
import { PaymentFilterPill } from "@/features/orders/components/order-filters/payment-filter-pill";
import { PeriodFilterPill } from "@/features/orders/components/order-filters/period-filter-pill";
import { SingleChoicePill } from "@/features/orders/components/order-filters/single-choice-pill";
import {
  DistrictFilterPill,
  RegionFilterPill,
  ZoneFilterPill,
} from "@/features/orders/components/order-filters/zone-filter-pills";
import {
  APP_FILTERS,
  CREATOR_FILTERS,
  DELIVERY_DATE_FILTERS,
  SUGGESTED_FILTERS,
} from "@/features/orders/server-filters";
import { ORDER_TAGS } from "@/features/orders/tags";
import { LOGIST_STATUSES } from "@/features/orders/types";
import type { OrderFilters } from "@/features/orders/use-order-filters";
import { queryKeys } from "@/lib/query-keys";

const toOptions = (items: ReadonlyArray<{ value: string; label: string }>) =>
  items.map((item) => ({ value: item.value, label: item.label }));

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-ink-faint text-micro font-bold tracking-widest uppercase">{title}</h3>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </section>
  );
}

/**
 * Barcha filtrlar — guruhlangan (`FiltersSheet` ichida): Vaqt · Hudud ·
 * Buyurtma · Yetkazish. Filial tanlovi yo'q — logist faqat o'z filialida
 * ishlaydi (backend cheklaydi). Hammasi serverda (2026-10-01 C §11,
 * `server-filters.ts`): doska ustuni 20 qatorga qirqiladi va mijozdagi
 * filtr "N more" ni ko'rmasdi.
 */
export function OrderFilterGroups({
  filters: f,
  isBoard,
}: {
  filters: OrderFilters;
  isBoard: boolean;
}) {
  return (
    <div role="group" aria-label="Buyurtma filtrlari" className="flex flex-col gap-5">
      <FilterSection title="Vaqt">
        <PeriodFilterPill filters={f} />
        <SingleChoicePill
          label="Yetk. sana"
          icon={CalendarDays}
          options={toOptions(DELIVERY_DATE_FILTERS)}
          value={f.deliveryDate}
          onChange={(next) => void f.setDeliveryDate(next)}
        />
      </FilterSection>

      <FilterSection title="Hudud">
        <RegionFilterPill filters={f} />
        <ZoneFilterPill filters={f} />
        <DistrictFilterPill filters={f} />
      </FilterSection>

      <FilterSection title="Buyurtma">
        {!isBoard ? (
          <FilterDropdown
            label="Status"
            icon={CircleDot}
            options={LOGIST_STATUSES.map((item) => ({
              value: item.value,
              label: item.label,
              color: item.mark,
            }))}
            selected={f.statuses}
            onSelect={(value) => {
              const next = f.statuses.includes(value)
                ? f.statuses.filter((item) => item !== value)
                : [...f.statuses, value];
              void f.setStatuses(next.length ? next : null);
            }}
            onClear={f.statuses.length ? () => void f.setStatuses(null) : undefined}
            closeOnSelect={false}
          />
        ) : null}
        <SingleChoicePill
          label="Yaratdi"
          icon={UserRound}
          options={toOptions(CREATOR_FILTERS)}
          value={f.creator}
          onChange={(next) => void f.setCreator(next)}
        />
        <PaymentFilterPill filters={f} />
        <SingleChoicePill
          label="Ilova"
          icon={Smartphone}
          options={toOptions(APP_FILTERS)}
          value={f.app}
          onChange={(next) => void f.setApp(next)}
        />
        <SingleChoicePill
          label="Teg"
          icon={Tag}
          options={ORDER_TAGS.map((tag) => ({
            value: tag.value,
            label: tag.label,
            color: tag.color,
          }))}
          value={f.tagFilter}
          onChange={(next) => void f.setTagFilter(next)}
        />
      </FilterSection>

      <FilterSection title="Yetkazish">
        <ChiefFilterPill filters={f} />
        <SingleChoicePill
          label="Taklif"
          icon={Sparkles}
          options={toOptions(SUGGESTED_FILTERS)}
          value={f.suggested}
          onChange={(next) => void f.setSuggested(next)}
        />
      </FilterSection>
    </div>
  );
}

/** Keng ekranda qatorda turadigan eng ko'p ishlatiladigan ikkitasi. */
export function PrimaryFilterPills({ filters: f }: { filters: OrderFilters }) {
  return (
    <div className="flex items-center gap-2">
      <PeriodFilterPill filters={f} />
      <RegionFilterPill filters={f} />
    </div>
  );
}

/**
 * Bosh kuryer filtri (`?chief=`): logist zakazni bosh kuryerga beradi
 * (2026-10-30) — «Bosh kuryersiz» hali hech kimga berilmaganlar.
 */
function ChiefFilterPill({ filters: f }: { filters: OrderFilters }) {
  const chiefs = useQuery({
    queryKey: queryKeys.chiefOptions(null),
    queryFn: ({ signal }) => fetchChiefOptions(null, signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const list = chiefs.data ?? [];
  if (list.length === 0 && f.chief === null) return null;
  return (
    <SingleChoicePill
      label="Bosh kuryer"
      icon={UserRoundCog}
      options={[
        { value: "none", label: "Bosh kuryersiz" },
        ...list.map((chief) => ({ value: String(chief.id), label: chief.fullName })),
      ]}
      value={f.chief}
      onChange={(next) => void f.setChief(next)}
      searchable={list.length > 6}
      searchPlaceholder="Bosh kuryer qidirish..."
      contentClassName="w-64"
    />
  );
}

