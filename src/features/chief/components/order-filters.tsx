"use client";

import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";

import { DateRangeField } from "@/components/kit/date-range";
import { SearchInput } from "@/components/kit/search-input";
import { SelectField } from "@/components/kit/select-field";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { fetchChiefCouriers, fetchChiefFilials, fetchChiefZones } from "@/features/chief/api";
import type { ChiefMe } from "@/features/chief/types";
import type { OrderFilterControls } from "@/features/chief/use-order-filters";
import { regionLabel } from "@/features/orders/regions";
import { districtName } from "@/features/zones/types";
import { useRegionsDictionary } from "@/features/zones/use-zones";
import { toIsoDay, todayIso } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/stores/locale-store";

type Chip = { key: string; label: string; clear: () => void; translate?: boolean };

/**
 * Zakazlar qidiruvi va filtrlari: desktopda bir qatorda, telefonda «Filtrlar»
 * varag'ida. Faol filtrlar pastda chip bo'lib turadi — bittalab yoki birdan tozalanadi.
 */
export function OrderFilters({ me, controls }: { me: ChiefMe; controls: OrderFilterControls }) {
  const options = useFilterOptions(me);
  const urlQuery = controls.state.q ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [synced, setSynced] = useState(urlQuery);
  // URL tashqaridan o'zgarsa (tozalash, orqaga) — maydon ham ergashadi.
  if (urlQuery !== synced) {
    setSynced(urlQuery);
    setQuery(urlQuery);
  }

  // Har harfda so'rov ketmasin — yozib bo'lgach URLga tushadi.
  useEffect(() => {
    if (query === urlQuery) return;
    const timer = setTimeout(() => controls.set({ q: query || null }), 300);
    return () => clearTimeout(timer);
  }, [query, urlQuery, controls]);

  const chips = activeChips(controls, options);
  const fields = <FilterFields me={me} controls={controls} options={options} />;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Raqam, mijoz, telefon, manzil yoki mahsulot"
          className="min-w-0 flex-1"
        />
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="shrink-0 lg:hidden">
              <SlidersHorizontal />
              Filtrlar
              {controls.activeCount > 0 ? <span className="tabular text-brand font-semibold">{controls.activeCount}</span> : null}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-11/12 overflow-y-auto rounded-t-2xl p-4">
            <SheetTitle>Filtrlar</SheetTitle>
            <div className="mt-2 flex flex-col gap-3">{fields}</div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden flex-wrap items-center gap-2 lg:flex">{fields}</div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Faol filtrlar">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              aria-label={`${chip.label}: olib tashlash`}
              className="border-brand bg-brand-soft text-brand inline-flex h-7 items-center gap-1 rounded-full border pr-1.5 pl-2.5 text-meta font-medium"
            >
              {chip.translate ? <span>{chip.label}</span> : <span data-no-translit>{chip.label}</span>}
              <X className="size-3.5" aria-hidden />
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={controls.clear}>
            Hammasini tozalash
          </Button>
        </div>
      ) : null}
    </div>
  );
}

type FilterOptions = ReturnType<typeof useFilterOptions>;

function useFilterOptions(me: ChiefMe) {
  const locale = useLocaleStore((state) => state.locale);
  const zones = useQuery({ queryKey: queryKeys.chiefZones, queryFn: ({ signal }) => fetchChiefZones(signal) });
  const couriers = useQuery({ queryKey: queryKeys.chiefCouriers, queryFn: ({ signal }) => fetchChiefCouriers(signal) });
  const filials = useQuery({ queryKey: queryKeys.chiefFilials, queryFn: ({ signal }) => fetchChiefFilials(signal), staleTime: 10 * 60_000 });
  const dictionary = useRegionsDictionary();
  const regions = (dictionary.data ?? []).filter((item) => me.regions.includes(item.region));
  return {
    zones: (zones.data?.zones ?? []).map((zone) => ({ value: String(zone.id), label: zone.name, translate: false })),
    couriers: (couriers.data ?? []).map((courier) => ({ value: String(courier.id), label: courier.fullName, translate: false })),
    filials: (filials.data ?? []).map((filial) => ({ value: String(filial.id), label: filial.name, translate: false })),
    regions: me.regions.map((code) => ({ value: code, label: regionLabel(code) })),
    districts: (region: string | null) =>
      regions
        .filter((item) => region === null || item.region === region)
        .flatMap((item) => item.districts)
        .map((district) => ({ value: district.code, label: districtName(district, locale), translate: false })),
  };
}

function FilterFields({ me, controls, options }: { me: ChiefMe; controls: OrderFilterControls; options: FilterOptions }) {
  const { state } = controls;
  const today = todayIso();
  const yesterday = toIsoDay(subDays(new Date(), 1));
  const preset = state.from === today && state.to === today ? "today" : state.from === yesterday && state.to === yesterday ? "yesterday" : null;
  const custom = preset === null && Boolean(state.from || state.to);

  return (
    <>
      <div role="group" aria-label="Sana" className="flex flex-wrap items-center gap-1.5">
        <DayChip active={preset === "today"} onClick={() => controls.set({ from: preset === "today" ? null : today, to: preset === "today" ? null : today })}>
          Bugun
        </DayChip>
        <DayChip active={preset === "yesterday"} onClick={() => controls.set({ from: preset === "yesterday" ? null : yesterday, to: preset === "yesterday" ? null : yesterday })}>
          Kecha
        </DayChip>
        <DateRangeField
          from={custom ? (state.from ?? "") : ""}
          to={custom ? (state.to ?? "") : ""}
          onChange={(from, to) => controls.set({ from: from || null, to: to || null })}
          onClear={custom ? () => controls.set({ from: null, to: null }) : undefined}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
        <SelectField
          label="Zona"
          allLabel="Hamma zona"
          value={state.zone === null ? null : String(state.zone)}
          options={options.zones}
          onChange={(value) => controls.set({ zone: value === null ? null : Number(value) })}
          className="lg:w-44"
        />
        <SelectField
          label="Kuryer"
          allLabel="Hamma kuryer"
          value={state.courier === null ? null : String(state.courier)}
          options={options.couriers}
          onChange={(value) => controls.set({ courier: value === null ? null : Number(value) })}
          className="lg:w-44"
        />
        <SelectField
          label="Filial"
          allLabel="Hamma filial"
          value={state.filial === null ? null : String(state.filial)}
          options={options.filials}
          onChange={(value) => controls.set({ filial: value === null ? null : Number(value) })}
          className="lg:w-40"
        />
        {me.regions.length > 1 ? (
          <SelectField
            label="Viloyat"
            allLabel="Hamma viloyat"
            value={state.region}
            options={options.regions}
            onChange={(value) => controls.set({ region: value, district: null })}
            className="lg:w-44"
          />
        ) : null}
        <SelectField
          label="Tuman"
          allLabel="Hamma tuman"
          value={state.district}
          options={options.districts(state.region)}
          onChange={(value) => controls.set({ district: value })}
          className="lg:w-48"
        />
      </div>
    </>
  );
}

function DayChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-(--control-h) items-center rounded-full border px-3.5 text-dense font-medium transition-colors duration-(--dur-micro)",
        active ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function labelOf(list: Array<{ value: string; label: string }>, value: string | number | null): string {
  return list.find((item) => item.value === String(value))?.label ?? String(value);
}

function activeChips(controls: OrderFilterControls, options: FilterOptions): Chip[] {
  const { state, set } = controls;
  const chips: Chip[] = [];
  if (state.from || state.to) {
    const range = state.from === state.to ? (state.from ?? "") : `${state.from ?? "…"} — ${state.to ?? "…"}`;
    chips.push({ key: "date", label: range, clear: () => set({ from: null, to: null }) });
  }
  if (state.zone !== null) chips.push({ key: "zone", label: labelOf(options.zones, state.zone), clear: () => set({ zone: null }) });
  if (state.courier !== null) chips.push({ key: "courier", label: labelOf(options.couriers, state.courier), clear: () => set({ courier: null }) });
  if (state.filial !== null) chips.push({ key: "filial", label: labelOf(options.filials, state.filial), clear: () => set({ filial: null }) });
  if (state.region) chips.push({ key: "region", label: labelOf(options.regions, state.region), clear: () => set({ region: null, district: null }), translate: true });
  if (state.district) chips.push({ key: "district", label: labelOf(options.districts(null), state.district), clear: () => set({ district: null }) });
  return chips;
}
